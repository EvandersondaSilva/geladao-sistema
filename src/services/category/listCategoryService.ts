import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

class ListCategoryService {
  async execute() {
    try {
      const categories = await prismaClient.category.findMany({
        select: {
          id: true,
          name: true,
          displayOrder: true,
          createdAt: true,
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });

      return categories;
    } catch (error) {
      throw new AppError("Falha ao listar categorias", 500);
    }
  }
}

export { ListCategoryService };
