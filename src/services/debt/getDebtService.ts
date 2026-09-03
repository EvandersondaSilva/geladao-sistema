import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { debtSelect } from "../../prisma/selects";
import { calculateDebtBalance } from "./calculateDebtBalance";

class GetDebtService {
  async execute(id: string) {
    try {
      const debt = await prismaClient.debt.findUnique({
        where: { id },
        select: debtSelect,
      });

      if (!debt) {
        throw new AppError("Fiado não encontrado", 404);
      }

      return { ...debt, balance: calculateDebtBalance(debt) };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao buscar fiado", 500);
    }
  }
}

export { GetDebtService };
