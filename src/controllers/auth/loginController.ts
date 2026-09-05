import { Request, Response } from "express";
import { LoginService } from "../../services/auth/loginService";

class LoginController {
  async handle(req: Request, res: Response) {
    const { email, password } = req.body;

    const loginService = new LoginService();

    const result = await loginService.execute({ email, password });

    res.status(200).json(result);
  }
}

export { LoginController };
