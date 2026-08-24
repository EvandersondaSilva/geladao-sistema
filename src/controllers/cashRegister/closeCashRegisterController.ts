import { Request, Response } from "express";
import { CloseCashRegisterService } from "../../services/cashRegister/closeCashRegisterService";

class CloseCashRegisterController {
  async handle(req: Request, res: Response) {
    const cashRegisterId = req.params.id as string;
    const { reportedClosingAmount } = req.body;

    const closeCashRegisterService = new CloseCashRegisterService();

    const cashRegister = await closeCashRegisterService.execute({
      id: cashRegisterId,
      reportedClosingAmount,
    });

    res.status(200).json(cashRegister);
  }
}

export { CloseCashRegisterController };
