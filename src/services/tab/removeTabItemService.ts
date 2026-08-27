import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface RemoveTabItemRequest {
  tabId: string;
  itemId: string;
}

class RemoveTabItemService {
  async execute({ tabId, itemId }: RemoveTabItemRequest) {
    try {
      await prismaClient.$transaction(async (tx) => {
        const tab = await tx.tab.findUnique({
          where: { id: tabId },
          select: { id: true, status: true },
        });

        if (!tab) {
          throw new AppError("Comanda não encontrada", 404);
        }

        if (tab.status !== "OPEN") {
          throw new AppError("Comanda já está fechada", 409);
        }

        const item = await tx.tabItem.findUnique({
          where: { id: itemId },
          select: { id: true, tabId: true, productId: true, quantity: true, cancelledAt: true },
        });

        if (!item || item.tabId !== tabId) {
          throw new AppError("Item não encontrado nesta comanda", 404);
        }

        if (item.cancelledAt) {
          throw new AppError("Item já foi removido da comanda", 409);
        }

        // Soft cancel instead of a DELETE: the row has to survive so both the
        // original OUTBOUND and this reversal keep pointing at a real tabItemId.
        await tx.tabItem.update({
          where: { id: itemId },
          data: { cancelledAt: new Date() },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "INBOUND",
            reason: "CANCELLATION_REVERSAL",
            quantity: item.quantity,
            tabItemId: item.id,
          },
        });
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao remover item da comanda", 500);
    }
  }
}

export { RemoveTabItemService };
