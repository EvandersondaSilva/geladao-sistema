import { Request, Response } from "express";
import { GetOperatorPinStatusService } from "../../services/settings/getOperatorPinStatusService";

class GetOperatorPinStatusController {
  async handle(req: Request, res: Response) {
    const getOperatorPinStatusService = new GetOperatorPinStatusService();

    const status = await getOperatorPinStatusService.execute();

    res.status(200).json(status);
  }
}

export { GetOperatorPinStatusController };
