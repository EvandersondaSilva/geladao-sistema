import { Request, Response } from "express";
import { CancelTabService } from "../../services/tab/cancelTabService";

class CancelTabController {
  async handle(req: Request, res: Response) {
    const tabId = req.params.id as string;

    const cancelTabService = new CancelTabService();

    const tab = await cancelTabService.execute(tabId);

    res.status(200).json(tab);
  }
}

export { CancelTabController };
