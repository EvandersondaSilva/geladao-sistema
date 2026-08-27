import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface ListStockMovementRequest {
  productId?: string;
  reason?: "SALE" | "CANCELLATION_REVERSAL" | "RESTOCK" | "MANUAL_ADJUSTMENT";
  dateFrom?: Date;
  dateTo?: Date;
}

class ListStockMovementService {
  async execute({ productId, reason, dateFrom, dateTo }: ListStockMovementRequest) {
    try {
      const stockMovements = await prismaClient.stockMovement.findMany({
        where: {
          ...(productId && { productId }),
          ...(reason && { reason }),
          ...((dateFrom || dateTo) && {
            createdAt: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }),
        },
        select: {
          id: true,
          productId: true,
          type: true,
          reason: true,
          quantity: true,
          saleId: true,
          orderId: true,
          tabItemId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return stockMovements;
    } catch (error) {
      throw new AppError("Falha ao listar movimentos de estoque", 500);
    }
  }
}

export { ListStockMovementService };
