import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { presentTab } from "../tab/presentTab";
import { calculateCashRegisterTotals } from "./calculateCashRegisterTotals";

class GetCashRegisterService {
  async execute(id: string) {
    try {
      const cashRegister = await prismaClient.cashRegister.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          openingAmount: true,
          reportedClosingAmount: true,
          openedAt: true,
          closedAt: true,
        },
      });

      if (!cashRegister) {
        throw new AppError("Caixa não encontrado", 404);
      }

      const [totals, sales, tabs] = await Promise.all([
        calculateCashRegisterTotals(prismaClient, {
          cashRegisterId: id,
          openingAmount: cashRegister.openingAmount,
        }),
        prismaClient.sale.findMany({
          where: { cashRegisterId: id },
          select: {
            id: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productId: true,
                product: { select: { name: true } },
                quantity: true,
                unitPrice: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prismaClient.tab.findMany({
          where: { cashRegisterId: id },
          select: tabSelect,
          orderBy: { openedAt: "desc" },
        }),
      ]);

      return {
        ...cashRegister,
        ...totals,
        // nothing has been counted yet on an open register, so there is nothing
        // to be off by — the difference only exists once a closing amount was
        // reported. expectedAmount, though, is useful mid-shift.
        difference:
          cashRegister.reportedClosingAmount === null
            ? null
            : cashRegister.reportedClosingAmount - totals.expectedAmount,
        sales,
        tabs: tabs.map(presentTab),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao buscar caixa", 500);
    }
  }
}

export { GetCashRegisterService };
