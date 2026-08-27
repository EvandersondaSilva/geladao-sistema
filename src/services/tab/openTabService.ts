import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { calculateTabTotal } from "./calculateTabTotal";

interface OpenTabRequest {
  customerName: string;
  cashRegisterId: string;
}

class OpenTabService {
  async execute({ customerName, cashRegisterId }: OpenTabRequest) {
    try {
      const tab = await prismaClient.$transaction(async (tx) => {
        const cashRegister = await tx.cashRegister.findUnique({
          where: { id: cashRegisterId },
          select: { id: true, status: true },
        });

        if (!cashRegister) {
          throw new AppError("Caixa não encontrado", 404);
        }

        if (cashRegister.status !== "OPEN") {
          throw new AppError("Caixa não está aberto", 409);
        }

        return tx.tab.create({
          data: { customerName, cashRegisterId },
          select: tabSelect,
        });
      });

      return { ...tab, total: calculateTabTotal(tab.items) };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao abrir comanda", 500);
    }
  }
}

export { OpenTabService };
