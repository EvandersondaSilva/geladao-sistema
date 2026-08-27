import { Request, Response } from "express";
import { RemoveTabItemService } from "../../services/tab/removeTabItemService";

class RemoveTabItemController {
  async handle(req: Request, res: Response) {
    const tabId = req.params.id as string;
    const itemId = req.params.itemId as string;

    const removeTabItemService = new RemoveTabItemService();

    await removeTabItemService.execute({ tabId, itemId });

    res.status(204).send();
  }
}

export { RemoveTabItemController };
