import { plainToInstance } from "class-transformer";
import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { GetTransactionDTO } from "./dto/get-transaction.dto";
import { TransactionService } from "./transaction.service";
import { CreateTransactionDTO } from "./dto/create-transaction.dto";

@injectable()
export class TransactionController {
  private transactionService: TransactionService;

  constructor(TransactionService: TransactionService) {
    this.transactionService = TransactionService;
  }

  getTransactionsByOrganizer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
    //   const authUserId = Number(res.locals.user.id);
      const query = plainToInstance(GetTransactionDTO, req.query);
      const result = await this.transactionService.getTransactionsByOrganizer(
        // authUserId,
        query
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

getTransactionDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { uuid } = req.params;
      const result = await this.transactionService.getTransactionsDetail(
        uuid
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  }; 

  createTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const dto = plainToInstance(CreateTransactionDTO, req.body);
      const result = await this.transactionService.createTransaction(dto);
      res.status(201).send(result); 
    } catch (error) {
      next(error);
    }
  };

  notification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await this.transactionService.handleMidtransNotification(req.body);
      res.status(200).send("OK"); 
    } catch (error) {
      console.error("Midtrans notification error:", error);
      res.status(200).send("OK"); 
    }
  };

//   rejectTransaction = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ) => {
//     try {
//       const authUserId = Number(res.locals.user.id);
//       const { uuid } = req.params;
//       const result = await this.transactionService.rejectTransaction(
//         authUserId,
//         uuid
//       );
//       res.status(200).send(result);
//     } catch (error) {
//       next(error);
//     }
//   };

//   acceptTransaction = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ) => {
//     try {
//       const authUserId = Number(res.locals.user.id);
//       const { uuid } = req.params;
//       const result = await this.transactionService.acceptTransaction(
//         authUserId,
//         uuid
//       );
//       res.status(200).send(result);
//     } catch (error) {
//       next(error);
//     }
//   };
}