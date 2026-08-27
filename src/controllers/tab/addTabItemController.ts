import { Request, Response } from "express";
import { AddTabItemService } from "../../services/tab/addTabItemService";

class AddTabItemController {
  async handle(req: Request, res: Response) {
    const tabId = req.params.id as string;
    const { productId, quantity } = req.body;

    const addTabItemService = new AddTabItemService();

    const tab = await addTabItemService.execute({ tabId, productId, quantity });

    res.status(201).json(tab);
  }
}

export { AddTabItemController };
