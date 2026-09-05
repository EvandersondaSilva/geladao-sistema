import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { cashRegisterSelect } from "../../prisma/selects";

class GetCurrentCashRegisterService {
  async execute() {
    try {
      const cashRegister = await prismaClient.cashRegister.findFirst({
        where: { status: "OPEN" },
        select: cashRegisterSelect,
      });

      return cashRegister;
    } catch (error) {
      throw new AppError("Falha ao buscar caixa atual", 500);
    }
  }
}

export { GetCurrentCashRegisterService };
