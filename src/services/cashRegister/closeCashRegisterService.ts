import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface CloseCashRegisterRequest {
  id: string;
  reportedClosingAmount: number;
}

class CloseCashRegisterService {
  async execute({ id, reportedClosingAmount }: CloseCashRegisterRequest) {
    try {
      const cashRegister = await prismaClient.$transaction(async (tx) => {
        const current = await tx.cashRegister.findUnique({
          where: { id },
          select: { id: true, status: true, openingAmount: true },
        });

        if (!current) {
          throw new AppError("Caixa não encontrado", 404);
        }

        if (current.status !== "OPEN") {
          throw new AppError("Caixa já está fechado", 409);
        }

        const [cashSales, allSales] = await Promise.all([
          tx.sale.aggregate({
            where: { cashRegisterId: id, paymentMethod: "CASH" },
            _sum: { total: true },
          }),
          tx.sale.aggregate({
            where: { cashRegisterId: id },
            _sum: { total: true },
          }),
        ]);

        const expectedAmount = current.openingAmount + (cashSales._sum.total ?? 0);
        const totalRevenue = allSales._sum.total ?? 0;

        const updated = await tx.cashRegister.update({
          where: { id },
          data: {
            status: "CLOSED",
            reportedClosingAmount,
            closedAt: new Date(),
          },
          select: {
            id: true,
            status: true,
            openingAmount: true,
            reportedClosingAmount: true,
            openedAt: true,
            closedAt: true,
          },
        });

        return {
          ...updated,
          expectedAmount,
          totalRevenue,
          difference: reportedClosingAmount - expectedAmount,
        };
      });

      return cashRegister;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao fechar caixa", 500);
    }
  }
}

export { CloseCashRegisterService };
