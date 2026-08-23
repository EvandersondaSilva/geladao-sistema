import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface DeleteProductRequest {
  id: string;
}

class DeleteProductService {
  async execute({ id }: DeleteProductRequest) {
    try {
      await prismaClient.$transaction(async (tx) => {
        // A product with history can't just disappear: it would erase the
        // stock audit trail and the price snapshot of already-closed sales.
        const [saleItems, stockMovements] = await Promise.all([
          tx.saleItem.count({ where: { productId: id } }),
          tx.stockMovement.count({ where: { productId: id } }),
        ]);

        if (saleItems > 0 || stockMovements > 0) {
          throw new AppError(
            "Produto já possui histórico de vendas/estoque — desative-o (available: false) em vez de excluir",
            409
          );
        }

        await tx.product.delete({ where: { id } });
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new AppError("Produto não encontrado", 404);
        }

        if (error.code === "P2003") {
          throw new AppError("Produto está vinculado a um combo — remova-o do combo primeiro", 409);
        }
      }

      throw new AppError("Falha ao excluir produto", 500);
    }
  }
}

export { DeleteProductService };
