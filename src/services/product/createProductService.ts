import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { productSelect } from "../../prisma/selects";

interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  available?: boolean;
  currentStock?: number;
  minimumStock?: number;
  categoryId: string;
}

class CreateProductService {
  async execute({
    name,
    description,
    price,
    imageUrl,
    available,
    currentStock,
    minimumStock,
    categoryId,
  }: CreateProductRequest) {
    try {
      // Initial stock is audited too: it's born as an INBOUND/RESTOCK movement.
      const product = await prismaClient.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name,
            description,
            price,
            imageUrl,
            ...(available !== undefined && { available }),
            ...(currentStock !== undefined && { currentStock }),
            ...(minimumStock !== undefined && { minimumStock }),
            categoryId,
          },
          select: productSelect,
        });

        if (created.currentStock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              type: "INBOUND",
              reason: "RESTOCK",
              quantity: created.currentStock,
            },
          });
        }

        return created;
      });

      return product;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError("Categoria não encontrada", 404);
      }

      throw new AppError("Falha ao criar produto", 500);
    }
  }
}

export { CreateProductService };
