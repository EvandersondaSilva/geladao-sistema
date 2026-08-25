import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

class ListSaleService {
  async execute(cashRegisterId?: string) {
    try {
      const sales = await prismaClient.sale.findMany({
        where: { ...(cashRegisterId && { cashRegisterId }) },
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
        orderBy: { createdAt: "desc" },
      });

      return sales;
    } catch (error) {
      throw new AppError("Falha ao listar vendas", 500);
    }
  }
}

export { ListSaleService };
