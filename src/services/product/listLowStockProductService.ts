import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { productSelect } from "../../prisma/selects";

class ListLowStockProductService {
  async execute() {
    try {
      const products = await prismaClient.product.findMany({
        select: productSelect,
        orderBy: { name: "asc" },
      });

      return products.filter((product) => product.currentStock < product.minimumStock);
    } catch (error) {
      throw new AppError("Falha ao listar produtos com estoque baixo", 500);
    }
  }
}

export { ListLowStockProductService };
