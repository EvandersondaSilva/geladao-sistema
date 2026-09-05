import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { cashRegisterSelect } from "../../prisma/selects";
import { calculateCashRegisterTotals } from "./calculateCashRegisterTotals";

interface CloseCashRegisterRequest {
  id: string;
  reportedClosingAmount: number;
  closedById: string;
}

class CloseCashRegisterService {
  async execute({ id, reportedClosingAmount, closedById }: CloseCashRegisterRequest) {
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

        // An open tab is money still on the table — its items are already out of
        // stock but nobody has paid yet, so the register can't be reconciled.
        // Empty tabs are ignored on purpose: they can't be closed either (a tab
        // needs at least one item), so blocking on them would deadlock the close.
        const openTabs = await tx.tab.findMany({
          where: { cashRegisterId: id, status: "OPEN", items: { some: { cancelledAt: null } } },
          select: { customerName: true },
          orderBy: { openedAt: "asc" },
        });

        if (openTabs.length > 0) {
          const names = openTabs.map((tab) => tab.customerName).join(", ");

          throw new AppError(
            `Existem comandas abertas: ${names} — feche antes de fechar o caixa`,
            409
          );
        }

        const totals = await calculateCashRegisterTotals(tx, {
          cashRegisterId: id,
          openingAmount: current.openingAmount,
        });

        const updated = await tx.cashRegister.update({
          where: { id },
          data: {
            status: "CLOSED",
            reportedClosingAmount,
            closedAt: new Date(),
            closedById,
          },
          select: cashRegisterSelect,
        });

        return {
          ...updated,
          ...totals,
          difference: reportedClosingAmount - totals.expectedAmount,
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
