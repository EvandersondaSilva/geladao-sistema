import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface UpdateCategoryRequest {
  id: string;
  name: string;
  displayOrder?: number;
}

class UpdateCategoryService {
  async execute({ id, name, displayOrder }: UpdateCategoryRequest) {
    try {
      const category = await prismaClient.category.update({
        where: { id },
        data: {
          name,
          ...(displayOrder !== undefined && { displayOrder }),
        },
        select: {
          id: true,
          name: true,
          displayOrder: true,
          createdAt: true,
        },
      });

      return category;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Categoria não encontrada", 404);
      }

      throw new AppError("Falha ao editar categoria", 500);
    }
  }
}

export { UpdateCategoryService };
