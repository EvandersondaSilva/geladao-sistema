import { Request, Response } from "express";
import { UpdateOperatorPinService } from "../../services/settings/updateOperatorPinService";

class UpdateOperatorPinController {
  async handle(req: Request, res: Response) {
    const { currentPin, newPin } = req.body;

    const updateOperatorPinService = new UpdateOperatorPinService();

    const settings = await updateOperatorPinService.execute({ currentPin, newPin });

    res.status(200).json(settings);
  }
}

export { UpdateOperatorPinController };
