import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

class GetCurrentCashRegisterService {
  async execute() {
    try {
      const cashRegister = await prismaClient.cashRegister.findFirst({
        where: { status: "OPEN" },
        select: {
          id: true,
          status: true,
          openingAmount: true,
          reportedClosingAmount: true,
          openedAt: true,
          closedAt: true,
        },
      });

      return cashRegister;
    } catch (error) {
      throw new AppError("Falha ao buscar caixa atual", 500);
    }
  }
}

export { GetCurrentCashRegisterService };
