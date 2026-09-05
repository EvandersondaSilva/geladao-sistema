import { Request, Response } from "express";
import { UpdateUserService } from "../../services/user/updateUserService";

class UpdateUserController {
  async handle(req: Request, res: Response) {
    const userId = req.params.id as string;
    const { name, role, active } = req.body;

    const updateUserService = new UpdateUserService();

    const user = await updateUserService.execute({ id: userId, name, role, active });

    res.status(200).json(user);
  }
}

export { UpdateUserController };
