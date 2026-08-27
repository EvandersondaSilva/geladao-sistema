import { Request, Response } from "express";
import { OpenTabService } from "../../services/tab/openTabService";

class OpenTabController {
  async handle(req: Request, res: Response) {
    const { customerName, cashRegisterId } = req.body;

    const openTabService = new OpenTabService();

    const tab = await openTabService.execute({ customerName, cashRegisterId });

    res.status(201).json(tab);
  }
}

export { OpenTabController };
