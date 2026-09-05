import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { calculateTabTotal } from "./calculateTabTotal";
import { presentTab } from "./presentTab";

interface MarkTabAsFiadoRequest {
  tabId: string;
  customerId: string;
  closedById: string;
}

class MarkTabAsFiadoService {
  async execute({ tabId, customerId, closedById }: MarkTabAsFiadoRequest) {
    try {
      const result = await prismaClient.$transaction(async (tx) => {
        const current = await tx.tab.findUnique({
          where: { id: tabId },
          select: {
            id: true,
            status: true,
            cashRegisterId: true,
            items: { where: { cancelledAt: null }, select: { quantity: true, unitPrice: true } },
          },
        });

        if (!current) {
          throw new AppError("Comanda não encontrada", 404);
        }

        if (current.status === "CANCELLED") {
          throw new AppError("Comanda foi cancelada — não é possível marcar como fiado", 409);
        }

        if (current.status !== "OPEN") {
          throw new AppError("Comanda já está fechada", 409);
        }

        if (current.items.length === 0) {
          throw new AppError("Comanda não possui itens — não é possível marcar como fiado", 409);
        }

        // free text will not do for a debt: it has to be a real customer, so the
        // João who owes 340 can be recognised as the João who walks back in
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { id: true },
        });

        if (!customer) {
          throw new AppError("Cliente não encontrado", 404);
        }

        const amount = calculateTabTotal(current.items);

        // No stock movement here, same as a normal close — the goods already left
        // item by item. paymentMethod stays null on purpose: nothing was received,
        // the money lives in the debt from now on.
        const tab = await tx.tab.update({
          where: { id: tabId },
          data: { status: "CLOSED", closedAt: new Date(), closedById },
          select: tabSelect,
        });

        const debt = await tx.debt.create({
          data: {
            customerId,
            amount,
            tabId,
            cashRegisterId: current.cashRegisterId,
          },
          select: {
            id: true,
            customerId: true,
            amount: true,
            status: true,
            tabId: true,
            cashRegisterId: true,
            createdAt: true,
          },
        });

        return { tab, debt };
      });

      return {
        ...presentTab(result.tab),
        debt: { ...result.debt, balance: result.debt.amount },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao marcar comanda como fiado", 500);
    }
  }
}

export { MarkTabAsFiadoService };
