import { Request, Response } from "express";
import { GetTabService } from "../../services/tab/getTabService";

class GetTabController {
  async handle(req: Request, res: Response) {
    const tabId = req.params.id as string;

    const getTabService = new GetTabService();

    const tab = await getTabService.execute(tabId);

    res.status(200).json(tab);
  }
}

export { GetTabController };
