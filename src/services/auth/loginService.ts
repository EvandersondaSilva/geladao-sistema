import bcrypt from "bcryptjs";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { signToken } from "../../auth/jwt";

interface LoginRequest {
  email: string;
  password: string;
}

class LoginService {
  async execute({ email, password }: LoginRequest) {
    try {
      const user = await prismaClient.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, password: true, role: true, active: true },
      });

      // Same message whether the email doesn't exist or the password is wrong —
      // telling them apart would let someone probe which emails have accounts.
      const invalidCredentials = () => {
        throw new AppError("E-mail ou senha inválidos", 401);
      };

      if (!user || !user.active) {
        return invalidCredentials();
      }

      const passwordMatches = await bcrypt.compare(password, user.password);

      if (!passwordMatches) {
        return invalidCredentials();
      }

      const token = signToken({ sub: user.id, role: user.role });

      return {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao fazer login", 500);
    }
  }
}

export { LoginService };
