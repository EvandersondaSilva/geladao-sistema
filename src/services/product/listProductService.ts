import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { productSelect } from "../../prisma/selects";

class ListProductService {
  async execute(categoryId?: string) {
    try {
      const products = await prismaClient.product.findMany({
        where: {
          available: true,
          ...(categoryId && { categoryId }),
        },
        select: productSelect,
        orderBy: { createdAt: "desc" },
      });

      return products;
    } catch (error) {
      throw new AppError("Falha ao listar produtos", 500);
    }
  }
}

export { ListProductService };
