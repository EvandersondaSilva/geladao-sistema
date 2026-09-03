import { Request, Response } from "express";
import { PayDebtService } from "../../services/debt/payDebtService";

class PayDebtController {
  async handle(req: Request, res: Response) {
    const debtId = req.params.id as string;
    const { amount, paymentMethod, cashRegisterId } = req.body;

    const payDebtService = new PayDebtService();

    const debt = await payDebtService.execute({ id: debtId, amount, paymentMethod, cashRegisterId });

    res.status(201).json(debt);
  }
}

export { PayDebtController };
