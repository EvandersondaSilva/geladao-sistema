import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { calculateTabTotal } from "./calculateTabTotal";

interface AddTabItemRequest {
  tabId: string;
  productId: string;
  quantity: number;
}

class AddTabItemService {
  async execute({ tabId, productId, quantity }: AddTabItemRequest) {
    try {
      const tab = await prismaClient.$transaction(async (tx) => {
        const current = await tx.tab.findUnique({
          where: { id: tabId },
          select: { id: true, status: true },
        });

        if (!current) {
          throw new AppError("Comanda não encontrada", 404);
        }

        if (current.status === "CANCELLED") {
          throw new AppError("Comanda foi cancelada", 409);
        }

        if (current.status !== "OPEN") {
          throw new AppError("Comanda já está fechada", 409);
        }

        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, price: true, currentStock: true },
        });

        if (!product) {
          throw new AppError("Produto não encontrado", 404);
        }

        if (product.currentStock < quantity) {
          throw new AppError(
            `Estoque insuficiente: disponível ${product.currentStock}, solicitado ${quantity}`,
            409
          );
        }

        // Stock leaves the fridge the moment the customer drinks it, even though
        // the tab is only paid at closing time — so the item is written off here,
        // with the same OUTBOUND/SALE audit pair POST /sales uses.
        const item = await tx.tabItem.create({
          data: { tabId, productId, quantity, unitPrice: product.price },
        });

        await tx.product.update({
          where: { id: productId },
          data: { currentStock: { decrement: quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            type: "OUTBOUND",
            reason: "SALE",
            quantity,
            tabItemId: item.id,
          },
        });

        return tx.tab.findUniqueOrThrow({ where: { id: tabId }, select: tabSelect });
      });

      return { ...tab, total: calculateTabTotal(tab.items) };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao adicionar item à comanda", 500);
    }
  }
}

export { AddTabItemService };
