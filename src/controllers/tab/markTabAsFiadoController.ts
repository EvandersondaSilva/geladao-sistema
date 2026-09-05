import { Request, Response } from "express";
import { MarkTabAsFiadoService } from "../../services/tab/markTabAsFiadoService";

class MarkTabAsFiadoController {
  async handle(req: Request, res: Response) {
    const tabId = req.params.id as string;
    const { customerId } = req.body;

    const markTabAsFiadoService = new MarkTabAsFiadoService();

    const tab = await markTabAsFiadoService.execute({
      tabId,
      customerId,
      closedById: req.userId as string,
    });

    res.status(200).json(tab);
  }
}

export { MarkTabAsFiadoController };
