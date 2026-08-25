import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

class ListCashRegisterService {
  async execute(status?: "OPEN" | "CLOSED") {
    try {
      const cashRegisters = await prismaClient.cashRegister.findMany({
        where: { ...(status && { status }) },
        select: {
          id: true,
          status: true,
          openingAmount: true,
          reportedClosingAmount: true,
          openedAt: true,
          closedAt: true,
        },
        orderBy: { openedAt: "desc" },
      });

      return cashRegisters;
    } catch (error) {
      throw new AppError("Falha ao listar caixas", 500);
    }
  }
}

export { ListCashRegisterService };
