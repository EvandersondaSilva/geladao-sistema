import { Request, Response } from "express";
import { AdjustProductStockService } from "../../services/product/adjustProductStockService";

class AdjustProductStockController {
  async handle(req: Request, res: Response) {
    const productId = req.params.id as string;
    const { type, reason, quantity } = req.body;

    const adjustProductStockService = new AdjustProductStockService();

    const product = await adjustProductStockService.execute({
      id: productId,
      type,
      reason,
      quantity,
    });

    res.status(200).json(product);
  }
}

export { AdjustProductStockController };
