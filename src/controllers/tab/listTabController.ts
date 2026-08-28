import { Request, Response } from "express";
import { ListTabService } from "../../services/tab/listTabService";

class ListTabController {
  async handle(req: Request, res: Response) {
    const status = req.query.status as "OPEN" | "CLOSED" | "CANCELLED" | undefined;

    const listTabService = new ListTabService();

    const tabs = await listTabService.execute(status);

    res.status(200).json(tabs);
  }
}

export { ListTabController };
