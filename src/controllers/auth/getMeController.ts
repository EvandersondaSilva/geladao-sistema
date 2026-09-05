import { Request, Response } from "express";
import { GetMeService } from "../../services/auth/getMeService";

class GetMeController {
  async handle(req: Request, res: Response) {
    const getMeService = new GetMeService();

    const user = await getMeService.execute(req.userId as string);

    res.status(200).json(user);
  }
}

export { GetMeController };
