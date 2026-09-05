import { Request, Response } from "express";
import { ListUserService } from "../../services/user/listUserService";

class ListUserController {
  async handle(req: Request, res: Response) {
    const listUserService = new ListUserService();

    const users = await listUserService.execute();

    res.status(200).json(users);
  }
}

export { ListUserController };
