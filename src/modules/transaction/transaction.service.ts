import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { GetTransactionDTO } from "./dto/get-transaction.dto";
import { CreateTransactionDTO } from "./dto/create-transaction.dto"; 
import CryptoJS from "crypto-js";
import { env } from "../../config";

@injectable()
export class TransactionService {
  private prisma: PrismaService;
  private mailService: MailService;

  constructor(PrismaClient: PrismaService, MailService: MailService) {
    this.prisma = PrismaClient;
    this.mailService = MailService;
  }

  getTransactionsByOrganizer = async (query: GetTransactionDTO) => {
    const { page, sortBy, sortOrder, take, search } = query;

    const transactions = await this.prisma.transaction.findMany({
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take,
      include: {
        transactionDetails: {
          include: {
            itemTransactionDetails: {
              include: {
                item: {
                  select: { itemName: true, price: true },
                },
              },
            },
          },
        },
      },
    });

    const count = await this.prisma.transaction.count({
      where: { deletedAt: null },
    });

    return {
      data: transactions,
      meta: { page, take, total: count },
      message: "Get transactions success",
    };
  };

  getTransactionsDetail = async (uuid: string) => {
    const transaction = await this.prisma.transaction.findUnique({
      where: { uuid },
      include: {
        transactionDetails: {
          include: {
            itemTransactionDetails: {
              include: {
                item: { select: { itemName: true, price: true } },
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }

    return transaction;
  };

    createTransaction = async (dto: CreateTransactionDTO) => {
    const { details, customerEmail, customerName, customerPhone } = dto;

    if (!details || details.length === 0) {
      throw new ApiError("Detail item wajib diisi", 400);
    }

    const itemIds = details.map(d => d.itemId);
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, price: true, itemName: true },
    });

    const itemMap = new Map(items.map(item => [item.id, item]));

    for (const d of details) {
      if (!itemMap.has(d.itemId)) {
        throw new ApiError(`Item dengan ID ${d.itemId} tidak ditemukan`, 404);
      }
    }

    let grandTotal = 0;
    const itemDetailsWithAmount = details.map(d => {
      const item = itemMap.get(d.itemId)!;
      const itemTotal = d.quantity * item.price;
      grandTotal += itemTotal;

      return {
        itemId: d.itemId,
        quantity: d.quantity,
        totalAmount: itemTotal,
        notes: d.notes,
        itemName: item.itemName,
        price: item.price,
      };
    });

    const adminFee = Math.ceil(grandTotal * 0.007);

    const transaction = await this.prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          totalAmount: grandTotal,
          adminFee,
          transactionStatus: "PENDING",
        },
      });

      for (const d of itemDetailsWithAmount) {
        const transactionDetail = await tx.transactionDetail.create({
          data: {
            transactionUuid: newTransaction.uuid,
            quantity: d.quantity,
            totalAmount: d.totalAmount,
            notes: d.notes,
          },
        });

        await tx.itemTransactionDetail.create({
          data: {
            transactionDetailId: transactionDetail.id,
            itemId: d.itemId,
          },
        });
      }

      return await tx.transaction.findUnique({
        where: { id: newTransaction.id },
        omit:{ id: true },
        include: {
          transactionDetails: {
            include: {
              itemTransactionDetails: {
                include: { item: { select: { itemName: true, price: true } } },
              },
            },
          },
        },
      });
    });

    if (!transaction) {
      throw new ApiError("Gagal membuat transaksi di database", 500);
    }

    const orderId = transaction.uuid;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grandTotal,  
      },
      customer_details: {
        first_name: customerName || "Customer",
        email: customerEmail,
        phone: customerPhone,
      },
      callbacks: {
        finish: `${env().FE_URL || "http://localhost:3000"}/transaction/finish?uuid=${orderId}`,
      },
    };

    let redirectUrl: string | undefined;
    let token: string | undefined;
    try {
      const serverKey = env().MIDTRANS_SERVER_KEY;
      if (!serverKey) {
        throw new Error("MIDTRANS_SERVER_KEY tidak diset di .env");
      }

      const isProduction = env().MIDTRANS_IS_PRODUCTION === "true";
      const baseUrl = isProduction
        ? "https://app.midtrans.com"
        : "https://app.sandbox.midtrans.com";

      const authString = Buffer.from(`${serverKey}:`).toString("base64");

      const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify(parameter),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Midtrans error ${response.status}: ${errText}`);
      }

      const data: { redirect_url?: string; token?: string } = await response.json();
      redirectUrl = data.redirect_url;
      token = data.token;

      if (!redirectUrl && data.token) {
        console.warn("redirect_url kosong, gunakan token untuk Snap.js pop-up");
      }
    } catch (error: any) {
      throw new ApiError(`Gagal generate QRIS Midtrans: ${error.message}`, 500);
    }

    return {
      message: "Transaksi dibuat, silakan bayar via QRIS",
      transaction,
      redirect_url: redirectUrl,
      token,
      estimatedTotalForCustomer: grandTotal + adminFee, 
    };
  };

  handleMidtransNotification = async (notification: any) => {
    const orderId = notification.order_id;

    const hash = CryptoJS.SHA512(
      orderId +
        notification.status_code +
        notification.gross_amount +
        (env().MIDTRANS_SERVER_KEY || "")
    ).toString(CryptoJS.enc.Hex);

    if (hash !== notification.signature_key) {
      throw new ApiError("Signature key tidak valid", 400);
    }

    let newStatus:
      | "PENDING"
      | "CAPTURE"
      | "SETTLEMENT"
      | "DENY"
      | "CANCEL"
      | "EXPIRE"
      | "FAILURE" = "PENDING";

    switch (notification.transaction_status) {
      case "capture":
      case "settlement":
        newStatus = "SETTLEMENT";
        break;
      case "deny":
        newStatus = "DENY";
        break;
      case "cancel":
        newStatus = "CANCEL";
        break;
      case "expire":
        newStatus = "EXPIRE";
        break;
      case "failure":
        newStatus = "FAILURE";
        break;
    }

    const updated = await this.prisma.transaction.update({
      where: { uuid: orderId },
      data: { transactionStatus: newStatus },
      include: {
        transactionDetails: {
          include: {
            itemTransactionDetails: {
              include: { item: { select: { itemName: true } } },
            },
          },
        },
      },
    });

    if (newStatus === "SETTLEMENT" && updated) {
      this.mailService.sendEmail(
        "admin@example.com",
        "Pembayaran Berhasil",
        "payment-success",
        {
          uuid: orderId,
          totalAmount: updated.totalAmount,
        }
      );
    }

    return { message: "Notification processed", status: newStatus };
  };
}