import { Request, Response } from "express";
import { ListStockMovementService } from "../../services/stockMovement/listStockMovementService";

class ListStockMovementController {
  async handle(req: Request, res: Response) {
    const productId = req.query.productId as string | undefined;
    const reason = req.query.reason as
      | "SALE"
      | "CANCELLATION_REVERSAL"
      | "RESTOCK"
      | "MANUAL_ADJUSTMENT"
      | undefined;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const listStockMovementService = new ListStockMovementService();

    const stockMovements = await listStockMovementService.execute({ productId, reason, dateFrom, dateTo });

    res.status(200).json(stockMovements);
  }
}

export { ListStockMovementController };
