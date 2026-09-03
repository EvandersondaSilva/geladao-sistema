import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { calculateRevenueTotals } from "./calculateRevenueTotals";

interface GetRevenueReportRequest {
  dateFrom?: Date;
  dateTo?: Date;
}

class GetRevenueReportService {
  async execute({ dateFrom, dateTo }: GetRevenueReportRequest) {
    try {
      const inRange = dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined;

      const [totals, salesCount, tabsCount, openDebts] = await Promise.all([
        calculateRevenueTotals(prismaClient, { dateFrom, dateTo }),
        prismaClient.sale.count({ where: { ...(inRange && { createdAt: inRange }) } }),
        prismaClient.tab.count({
          where: { status: "CLOSED", ...(inRange && { closedAt: inRange }) },
        }),
        // Not filtered by the period on purpose: what is still owed is a running
        // figure, not something that happened inside the date range.
        prismaClient.debt.findMany({
          where: { status: "OPEN" },
          select: { amount: true, payments: { select: { amount: true } } },
        }),
      ]);

      return {
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
        ...totals,
        salesCount,
        tabsCount,
        outstandingDebtTotal: openDebts.reduce(
          (acc, debt) =>
            acc + debt.amount - debt.payments.reduce((sum, payment) => sum + payment.amount, 0),
          0
        ),
      };
    } catch (error) {
      throw new AppError("Falha ao gerar relatório de faturamento", 500);
    }
  }
}

export { GetRevenueReportService };
