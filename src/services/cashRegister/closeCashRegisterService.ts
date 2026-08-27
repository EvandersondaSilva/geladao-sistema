import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { calculateTabTotal } from "../tab/calculateTabTotal";

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

        const [cashSales, allSales, closedTabs] = await Promise.all([
          tx.sale.aggregate({
            where: { cashRegisterId: id, paymentMethod: "CASH" },
            _sum: { total: true },
          }),
          tx.sale.aggregate({
            where: { cashRegisterId: id },
            _sum: { total: true },
          }),
          // Tab.total is not persisted, so it can't be aggregated in SQL — the
          // closed tabs of a single register are few enough to sum from their
          // item price snapshots here.
          tx.tab.findMany({
            where: { cashRegisterId: id, status: "CLOSED" },
            select: {
              paymentMethod: true,
              items: { where: { cancelledAt: null }, select: { quantity: true, unitPrice: true } },
            },
          }),
        ]);

        const closedTabsTotal = closedTabs.reduce(
          (acc, tab) => acc + calculateTabTotal(tab.items),
          0
        );

        const closedTabsCashTotal = closedTabs.reduce(
          (acc, tab) => (tab.paymentMethod === "CASH" ? acc + calculateTabTotal(tab.items) : acc),
          0
        );

        const expectedAmount =
          current.openingAmount + (cashSales._sum.total ?? 0) + closedTabsCashTotal;
        const totalRevenue = (allSales._sum.total ?? 0) + closedTabsTotal;

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
