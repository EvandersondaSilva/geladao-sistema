import { Request, Response } from "express";
import { OpenCashRegisterService } from "../../services/cashRegister/openCashRegisterService";

class OpenCashRegisterController {
  async handle(req: Request, res: Response) {
    const { openingAmount } = req.body;

    const openCashRegister = new OpenCashRegisterService();

    const cashRegister = await openCashRegister.execute({ openingAmount });

    res.status(201).json(cashRegister);
  }
}

export { OpenCashRegisterController };
