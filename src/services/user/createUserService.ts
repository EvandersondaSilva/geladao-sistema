import bcrypt from "bcryptjs";
import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { userSelect } from "../../prisma/selects";

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: "ADMIN" | "OPERATOR";
  // who is calling — undefined if the request carried no valid session
  requestingUserRole?: "ADMIN" | "OPERATOR";
}

const SALT_ROUNDS = 10;

class CreateUserService {
  async execute({ name, email, password, role, requestingUserRole }: CreateUserRequest) {
    try {
      const userCount = await prismaClient.user.count();

      // Mirrors how the old shared-PIN bootstrap worked: no proof is required
      // the very first time, because there is nobody yet to prove it to.
      if (userCount === 0) {
        role = "ADMIN";
      } else {
        if (!requestingUserRole) {
          throw new AppError("Login necessário", 401);
        }

        if (requestingUserRole !== "ADMIN") {
          throw new AppError("Ação restrita a administradores", 403);
        }
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await prismaClient.user.create({
        data: { name, email, password: passwordHash, role },
        select: userSelect,
      });

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("E-mail já cadastrado", 409);
      }

      throw new AppError("Falha ao cadastrar usuário", 500);
    }
  }
}

export { CreateUserService };
