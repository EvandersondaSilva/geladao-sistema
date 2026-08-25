import { Request, Response } from "express";
import { ListLowStockProductService } from "../../services/product/listLowStockProductService";

class ListLowStockProductController {
  async handle(req: Request, res: Response) {
    const listLowStockProductService = new ListLowStockProductService();

    const products = await listLowStockProductService.execute();

    res.status(200).json(products);
  }
}

export { ListLowStockProductController };
