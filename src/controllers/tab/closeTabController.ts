import { Request, Response } from "express";
import { CloseTabService } from "../../services/tab/closeTabService";

class CloseTabController {
  async handle(req: Request, res: Response) {
    const tabId = req.params.id as string;
    const { paymentMethod } = req.body;

    const closeTabService = new CloseTabService();

    const tab = await closeTabService.execute({
      id: tabId,
      paymentMethod,
      closedById: req.userId as string,
    });

    res.status(200).json(tab);
  }
}

export { CloseTabController };
