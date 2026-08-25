import { Request, Response } from "express";
import { GetSaleService } from "../../services/sale/getSaleService";

class GetSaleController {
  async handle(req: Request, res: Response) {
    const saleId = req.params.id as string;

    const getSaleService = new GetSaleService();

    const sale = await getSaleService.execute(saleId);

    res.status(200).json(sale);
  }
}

export { GetSaleController };
