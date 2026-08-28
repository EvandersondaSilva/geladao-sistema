import { Request, Response } from "express";
import { GetCashRegisterService } from "../../services/cashRegister/getCashRegisterService";

class GetCashRegisterController {
  async handle(req: Request, res: Response) {
    const cashRegisterId = req.params.id as string;

    const getCashRegisterService = new GetCashRegisterService();

    const cashRegister = await getCashRegisterService.execute(cashRegisterId);

    res.status(200).json(cashRegister);
  }
}

export { GetCashRegisterController };
