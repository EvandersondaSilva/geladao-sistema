import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { cashRegisterSelect } from "../../prisma/selects";

class ListCashRegisterService {
  async execute(status?: "OPEN" | "CLOSED") {
    try {
      const cashRegisters = await prismaClient.cashRegister.findMany({
        where: { ...(status && { status }) },
        select: cashRegisterSelect,
        orderBy: { openedAt: "desc" },
      });

      return cashRegisters;
    } catch (error) {
      throw new AppError("Falha ao listar caixas", 500);
    }
  }
}

export { ListCashRegisterService };
