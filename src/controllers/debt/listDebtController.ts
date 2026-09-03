import { Request, Response } from "express";
import { ListDebtService } from "../../services/debt/listDebtService";

class ListDebtController {
  async handle(req: Request, res: Response) {
    const status = req.query.status as "OPEN" | "PAID" | undefined;
    const customerId = req.query.customerId as string | undefined;

    const listDebtService = new ListDebtService();

    const debts = await listDebtService.execute({ status, customerId });

    res.status(200).json(debts);
  }
}

export { ListDebtController };
