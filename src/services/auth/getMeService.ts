import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { userSelect } from "../../prisma/selects";

class GetMeService {
  async execute(id: string) {
    try {
      const user = await prismaClient.user.findUnique({
        where: { id },
        select: userSelect,
      });

      if (!user) {
        throw new AppError("Usuário não encontrado", 404);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao buscar usuário", 500);
    }
  }
}

export { GetMeService };
