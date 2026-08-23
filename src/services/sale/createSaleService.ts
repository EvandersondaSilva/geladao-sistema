import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface CreateSaleItemRequest {
  productId: string;
  quantity: number;
}

interface CreateSaleRequest {
  cashRegisterId: string;
  paymentMethod: "CASH" | "CARD" | "PIX";
  items: CreateSaleItemRequest[];
}

class CreateSaleService {
  async execute({ cashRegisterId, paymentMethod, items }: CreateSaleRequest) {
    try {
      const sale = await prismaClient.$transaction(async (tx) => {
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

        const productIds = [...new Set(items.map((item) => item.productId))];

        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, price: true, currentStock: true },
        });

        const productMap = new Map(products.map((product) => [product.id, product]));

        // tracks the remaining balance as items get validated, to catch
        // overselling when the same product shows up in more than one line
        const remainingStock = new Map(products.map((product) => [product.id, product.currentStock]));

        for (const item of items) {
          const product = productMap.get(item.productId);

          if (!product) {
            throw new AppError(`Produto não encontrado: ${item.productId}`, 404);
          }

          const available = remainingStock.get(item.productId)!;

          if (available < item.quantity) {
            throw new AppError(
              `Estoque insuficiente para o produto ${item.productId}: disponível ${available}, solicitado ${item.quantity}`,
              409
            );
          }

          remainingStock.set(item.productId, available - item.quantity);
        }

        const total = items.reduce((acc, item) => {
          const product = productMap.get(item.productId)!;
          return acc + product.price * item.quantity;
        }, 0);

        const created = await tx.sale.create({
          data: { cashRegisterId, paymentMethod, total },
        });

        for (const item of items) {
          const product = productMap.get(item.productId)!;

          await tx.saleItem.create({
            data: {
              saleId: created.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.price,
            },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: "OUTBOUND",
              reason: "SALE",
              quantity: item.quantity,
              saleId: created.id,
            },
          });
        }

        return tx.sale.findUniqueOrThrow({
          where: { id: created.id },
          select: {
            id: true,
            cashRegisterId: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productId: true,
                quantity: true,
                unitPrice: true,
              },
            },
          },
        });
      });

      return sale;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao registrar venda", 500);
    }
  }
}

export { CreateSaleService };
