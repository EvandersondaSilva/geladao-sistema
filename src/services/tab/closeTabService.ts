import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { calculateTabTotal } from "./calculateTabTotal";

interface CloseTabRequest {
  id: string;
  paymentMethod: "CASH" | "CARD" | "PIX";
}

class CloseTabService {
  async execute({ id, paymentMethod }: CloseTabRequest) {
    try {
      const tab = await prismaClient.$transaction(async (tx) => {
        const current = await tx.tab.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            items: { where: { cancelledAt: null }, select: { id: true } },
          },
        });

        if (!current) {
          throw new AppError("Comanda não encontrada", 404);
        }

        if (current.status !== "OPEN") {
          throw new AppError("Comanda já está fechada", 409);
        }

        if (current.items.length === 0) {
          throw new AppError("Comanda não possui itens — não é possível fechar", 409);
        }

        // No StockMovement here on purpose: the write-off already happened item
        // by item as each one was added. Creating one now would double-count.
        return tx.tab.update({
          where: { id },
          data: { status: "CLOSED", paymentMethod, closedAt: new Date() },
          select: tabSelect,
        });
      });

      return { ...tab, total: calculateTabTotal(tab.items) };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao fechar comanda", 500);
    }
  }
}

export { CloseTabService };
