import { injectable } from "tsyringe";
import { ItemService } from "./item.service";
import { NextFunction, Request, Response } from "express";
import { GetItemDTO } from "./dto/get-item.dto";
import { plainToInstance } from "class-transformer";

@injectable()
export class ItemController {
  private itemService: ItemService;

  constructor(ItemService: ItemService) {
    this.itemService = ItemService;
  }

  getItems = async(
    req: Request,
    res: Response,
    next: NextFunction
  )=> {
    try {
        const query = plainToInstance(GetItemDTO, req.query);
        const items = await this.itemService.getItems(query);
        res.status(200).send(items)
    } catch (error) {
        next(error);
    }
  }
}
