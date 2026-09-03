import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface GetProductSalesReportRequest {
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

interface ProductSales {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

class GetProductSalesReportService {
  async execute({ dateFrom, dateTo, limit }: GetProductSalesReportRequest) {
    try {
      const inRange = dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined;

      // What sold is spread across two tables — counter sales and tab items — so
      // a ranking that read only `sale_items` would miss everything consumed on a
      // tab. Revenue is quantity x unitPrice, which SQL can't aggregate through
      // Prisma's groupBy, so both sides are folded together here.
      const [saleItems, tabItems] = await Promise.all([
        prismaClient.saleItem.findMany({
          where: { sale: { ...(inRange && { createdAt: inRange }) } },
          select: {
            productId: true,
            quantity: true,
            unitPrice: true,
            product: { select: { name: true } },
          },
        }),
        prismaClient.tabItem.findMany({
          // Cancelled items never sold. Only settled tabs count, to stay in step
          // with the revenue report — an open tab has not been sold yet, even
          // though its stock already left.
          where: {
            cancelledAt: null,
            tab: { status: "CLOSED", ...(inRange && { closedAt: inRange }) },
          },
          select: {
            productId: true,
            quantity: true,
            unitPrice: true,
            product: { select: { name: true } },
          },
        }),
      ]);

      const ranking = new Map<string, ProductSales>();

      for (const item of [...saleItems, ...tabItems]) {
        const current = ranking.get(item.productId) ?? {
          productId: item.productId,
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += item.quantity;
        current.revenue += item.quantity * item.unitPrice;

        ranking.set(item.productId, current);
      }

      const products = [...ranking.values()].sort((a, b) => b.quantity - a.quantity);

      return {
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
        products: limit ? products.slice(0, limit) : products,
      };
    } catch (error) {
      throw new AppError("Falha ao gerar relatório de produtos", 500);
    }
  }
}

export { GetProductSalesReportService };
