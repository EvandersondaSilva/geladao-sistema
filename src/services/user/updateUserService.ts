import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { userSelect } from "../../prisma/selects";

interface UpdateUserRequest {
  id: string;
  name?: string;
  role?: "ADMIN" | "OPERATOR";
  active?: boolean;
}

class UpdateUserService {
  async execute({ id, name, role, active }: UpdateUserRequest) {
    try {
      const user = await prismaClient.user.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(role !== undefined && { role }),
          ...(active !== undefined && { active }),
        },
        select: userSelect,
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Usuário não encontrado", 404);
      }

      throw new AppError("Falha ao atualizar usuário", 500);
    }
  }
}

export { UpdateUserService };
