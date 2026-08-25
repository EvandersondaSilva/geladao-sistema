import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

class GetSaleService {
  async execute(id: string) {
    try {
      const sale = await prismaClient.sale.findUnique({
        where: { id },
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

      if (!sale) {
        throw new AppError("Venda não encontrada", 404);
      }

      return sale;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao buscar venda", 500);
    }
  }
}

export { GetSaleService };
