import { Request, Response } from "express";
import { CreateSaleService } from "../../services/sale/createSaleService";

class CreateSaleController {
  async handle(req: Request, res: Response) {
    const { cashRegisterId, paymentMethod, items } = req.body;

    const createSaleService = new CreateSaleService();

    const sale = await createSaleService.execute({ cashRegisterId, paymentMethod, items });

    res.status(201).json(sale);
  }
}

export { CreateSaleController };
