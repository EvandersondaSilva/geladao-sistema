import { Request, Response } from "express";
import { ListSaleService } from "../../services/sale/listSaleService";

class ListSaleController {
  async handle(req: Request, res: Response) {
    const cashRegisterId = req.query.cashRegisterId as string | undefined;

    const listSaleService = new ListSaleService();

    const sales = await listSaleService.execute(cashRegisterId);

    res.status(200).json(sales);
  }
}

export { ListSaleController };
