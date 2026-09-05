import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { userSelect } from "../../prisma/selects";

class ListUserService {
  async execute() {
    try {
      const users = await prismaClient.user.findMany({
        select: userSelect,
        orderBy: { name: "asc" },
      });

      return users;
    } catch (error) {
      throw new AppError("Falha ao listar usuários", 500);
    }
  }
}

export { ListUserService };
