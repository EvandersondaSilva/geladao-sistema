import { Request, Response } from "express";
import { ListCashRegisterService } from "../../services/cashRegister/listCashRegisterService";

class ListCashRegisterController {
  async handle(req: Request, res: Response) {
    const status = req.query.status as "OPEN" | "CLOSED" | undefined;

    const listCashRegisterService = new ListCashRegisterService();

    const cashRegisters = await listCashRegisterService.execute(status);

    res.status(200).json(cashRegisters);
  }
}

export { ListCashRegisterController };
