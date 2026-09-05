import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { cashRegisterSelect } from "../../prisma/selects";

interface OpenCashRegisterRequest {
  openingAmount: number;
  openedById: string;
}

class OpenCashRegisterService {
  async execute({ openingAmount, openedById }: OpenCashRegisterRequest) {
    try {
      // Serializable: checking "is there an open cash register" and inserting
      // must be atomic, otherwise two concurrent requests open two registers.
      const cashRegister = await prismaClient.$transaction(
        async (tx) => {
          const openCashRegister = await tx.cashRegister.findFirst({
            where: { status: "OPEN" },
            select: { id: true },
          });

          if (openCashRegister) {
            throw new AppError("Já existe um caixa aberto", 409);
          }

          return tx.cashRegister.create({
            data: { openingAmount, openedById },
            select: cashRegisterSelect,
          });
        },
        { isolationLevel: "Serializable" }
      );

      return cashRegister;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao abrir caixa", 500);
    }
  }
}

export { OpenCashRegisterService };
