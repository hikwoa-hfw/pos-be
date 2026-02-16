import { Router } from "express";
import { injectable } from "tsyringe";
import { TransactionController } from "./transaction.controller";
// import { JwtMiddleware } from "../../middlewares/jwt.middleware";
// import { JWT_SECRET_KEY } from "../../config";

@injectable()
export class TransactionRouter {
  private router: Router;
  private transactionController: TransactionController;
  // private jwtMiddleware: JwtMiddleware;

  constructor(
    TransactionController: TransactionController,
    // JwtMiddleware: JwtMiddleware // uncomment kalau butuh auth
  ) {
    this.router = Router();
    this.transactionController = TransactionController;
    // this.jwtMiddleware = JwtMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // // 🔹 Middleware reusable (uncomment kalau butuh auth)
    // const authMiddleware = this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!);
    // const organizerMiddleware = verifyRole(["ORGANIZER"]); // kalau ada role middleware

    // GET all transactions (bisa tambah auth kalau perlu)
    this.router.get(
      "/",
      // authMiddleware, // uncomment kalau butuh login
      this.transactionController.getTransactionsByOrganizer
    );

    // GET detail transaction by uuid
    this.router.get(
      "/:uuid",
      // authMiddleware,
      this.transactionController.getTransactionDetail
    );

    // POST create transaction + generate QRIS Midtrans (kasir pakai ini)
    this.router.post(
      "/",
      // authMiddleware, // optional, tergantung kasir perlu login atau nggak
      this.transactionController.createTransaction
    );

    this.router.post(
      "/notification",
      this.transactionController.notification // jangan pakai auth middleware di sini!
    );

    // Kalau nanti butuh reject/accept, tambah route di sini
    // this.router.post("/:uuid/reject", authMiddleware, this.transactionController.rejectTransaction);
    // this.router.post("/:uuid/accept", authMiddleware, this.transactionController.acceptTransaction);
  };

  getRouter() {
    return this.router;
  }
}