import { Request, Response } from "express";
import { GetCurrentCashRegisterService } from "../../services/cashRegister/getCurrentCashRegisterService";

class GetCurrentCashRegisterController {
  async handle(req: Request, res: Response) {
    const getCurrentCashRegisterService = new GetCurrentCashRegisterService();

    const cashRegister = await getCurrentCashRegisterService.execute();

    res.status(200).json(cashRegister);
  }
}

export { GetCurrentCashRegisterController };
