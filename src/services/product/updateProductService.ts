import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { productSelect } from "../../prisma/selects";

interface UpdateProductRequest {
  id: string;
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  available?: boolean;
  minimumStock?: number;
  categoryId?: string;
}

class UpdateProductService {
  async execute({
    id,
    name,
    description,
    price,
    imageUrl,
    available,
    minimumStock,
    categoryId,
  }: UpdateProductRequest) {
    try {
      const product = await prismaClient.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(available !== undefined && { available }),
          ...(minimumStock !== undefined && { minimumStock }),
          ...(categoryId !== undefined && { categoryId }),
        },
        select: productSelect,
      });

      return product;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new AppError("Produto não encontrado", 404);
        }

        if (error.code === "P2003") {
          throw new AppError("Categoria não encontrada", 404);
        }
      }

      throw new AppError("Falha ao editar produto", 500);
    }
  }
}

export { UpdateProductService };
