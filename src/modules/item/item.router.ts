import { Router } from "express";
import { injectable } from "tsyringe";
import { ItemController } from "./item.controller";

@injectable()
export class ItemRouter {
  private router: Router;
  private itemController: ItemController;
  constructor(ItemController: ItemController) {
    this.router = Router();
    this.itemController = ItemController;
    this.InitializeRoutes();
  }

  private InitializeRoutes = () => {
    this.router.get("/", this.itemController.getItems);
  };

  getRouter() {
    return this.router;
  }
}
