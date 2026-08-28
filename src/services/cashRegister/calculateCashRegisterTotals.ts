import { Prisma } from "../../generated/prisma/client";
import { calculateTabTotal } from "../tab/calculateTabTotal";

type PaymentMethodTotals = Record<"CASH" | "CARD" | "PIX", number>;

interface CalculateCashRegisterTotalsRequest {
  cashRegisterId: string;
  openingAmount: number;
}

interface CashRegisterTotals {
  expectedAmount: number;
  totalRevenue: number;
  byPaymentMethod: PaymentMethodTotals;
}

// What a shift took in is Sale + closed Tab: a Tab never becomes a Sale, and
// Tab.total is not a column, so the tab half has to be summed in JS from the
// item price snapshots. Shared between closing the register and reading the
// shift summary so the two can never disagree about the same shift.
const calculateCashRegisterTotals = async (
  client: Prisma.TransactionClient,
  { cashRegisterId, openingAmount }: CalculateCashRegisterTotalsRequest
): Promise<CashRegisterTotals> => {
  const [salesByMethod, closedTabs] = await Promise.all([
    client.sale.groupBy({
      by: ["paymentMethod"],
      where: { cashRegisterId },
      _sum: { total: true },
    }),
    client.tab.findMany({
      where: { cashRegisterId, status: "CLOSED" },
      select: {
        paymentMethod: true,
        items: { where: { cancelledAt: null }, select: { quantity: true, unitPrice: true } },
      },
    }),
  ]);

  const byPaymentMethod: PaymentMethodTotals = { CASH: 0, CARD: 0, PIX: 0 };

  for (const row of salesByMethod) {
    byPaymentMethod[row.paymentMethod] += row._sum.total ?? 0;
  }

  for (const tab of closedTabs) {
    // a CLOSED tab always has one — it is picked at close time — but the column
    // is nullable because an OPEN tab has not chosen yet
    if (tab.paymentMethod) {
      byPaymentMethod[tab.paymentMethod] += calculateTabTotal(tab.items);
    }
  }

  return {
    // only cash is expected to physically be in the drawer
    expectedAmount: openingAmount + byPaymentMethod.CASH,
    totalRevenue: byPaymentMethod.CASH + byPaymentMethod.CARD + byPaymentMethod.PIX,
    byPaymentMethod,
  };
};

export { calculateCashRegisterTotals };
