import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { productSelect } from "../../prisma/selects";

interface AdjustProductStockRequest {
  id: string;
  type: "INBOUND" | "OUTBOUND";
  reason: "RESTOCK" | "MANUAL_ADJUSTMENT";
  quantity: number;
}

class AdjustProductStockService {
  async execute({ id, type, reason, quantity }: AdjustProductStockRequest) {
    try {
      const product = await prismaClient.$transaction(async (tx) => {
        const current = await tx.product.findUnique({
          where: { id },
          select: { id: true, currentStock: true },
        });

        if (!current) {
          throw new AppError("Produto não encontrado", 404);
        }

        if (type === "OUTBOUND" && current.currentStock < quantity) {
          throw new AppError(
            `Estoque insuficiente: disponível ${current.currentStock}, solicitado ${quantity}`,
            409
          );
        }

        const updated = await tx.product.update({
          where: { id },
          data: {
            currentStock: type === "INBOUND" ? { increment: quantity } : { decrement: quantity },
          },
          select: productSelect,
        });

        await tx.stockMovement.create({
          data: {
            productId: id,
            type,
            reason,
            quantity,
          },
        });

        return updated;
      });

      return product;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Produto não encontrado", 404);
      }

      throw new AppError("Falha ao ajustar estoque do produto", 500);
    }
  }
}

export { AdjustProductStockService };
