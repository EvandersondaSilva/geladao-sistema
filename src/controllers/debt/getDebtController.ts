import { Request, Response } from "express";
import { GetDebtService } from "../../services/debt/getDebtService";

class GetDebtController {
  async handle(req: Request, res: Response) {
    const debtId = req.params.id as string;

    const getDebtService = new GetDebtService();

    const debt = await getDebtService.execute(debtId);

    res.status(200).json(debt);
  }
}

export { GetDebtController };
