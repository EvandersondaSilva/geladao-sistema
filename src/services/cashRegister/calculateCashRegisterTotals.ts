import { Prisma } from "../../generated/prisma/client";
import { calculateTabTotal } from "../tab/calculateTabTotal";

type PaymentMethodTotals = Record<"CASH" | "CARD" | "PIX", number>;

interface CalculateCashRegisterTotalsRequest {
  cashRegisterId: string;
  openingAmount: number;
}

interface CashRegisterTotals {
  soldTotal: number;
  fiadoTotal: number;
  debtPaymentsTotal: number;
  receivedTotal: number;
  byPaymentMethod: PaymentMethodTotals;
  expectedAmount: number;
}

// The money side of a shift, in one place, so closing the register and reading
// the shift summary can never disagree about the same shift.
//
// Fiado is why there is more than one total here. Goods handed out on credit were
// SOLD but not RECEIVED, and credit from an earlier shift paid off today was
// RECEIVED but not sold today. Counting those in one number would either inflate
// revenue (the same 340 counted on the day it was sold and again on the day it
// was paid) or leave the drawer short. So:
//
//   soldTotal = receivedTotal - debtPaymentsTotal + fiadoTotal
//
// `PaymentMethod` deliberately has no FIADO member, which makes every sum over it
// money that actually came in — including expectedAmount, which is what has to be
// physically in the drawer.
const calculateCashRegisterTotals = async (
  client: Prisma.TransactionClient,
  { cashRegisterId, openingAmount }: CalculateCashRegisterTotalsRequest
): Promise<CashRegisterTotals> => {
  const [salesByMethod, closedTabs, creditGivenOut, debtPaymentsByMethod] = await Promise.all([
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
    client.debt.aggregate({ where: { cashRegisterId }, _sum: { amount: true } }),
    client.debtPayment.groupBy({
      by: ["paymentMethod"],
      where: { cashRegisterId },
      _sum: { amount: true },
    }),
  ]);

  const byPaymentMethod: PaymentMethodTotals = { CASH: 0, CARD: 0, PIX: 0 };

  for (const row of salesByMethod) {
    byPaymentMethod[row.paymentMethod] += row._sum.total ?? 0;
  }

  for (const tab of closedTabs) {
    // A tab closed on credit has no payment method — nothing was received for it,
    // it produced a Debt instead. Skipping it here is the point, not an oversight.
    if (tab.paymentMethod) {
      byPaymentMethod[tab.paymentMethod] += calculateTabTotal(tab.items);
    }
  }

  for (const row of debtPaymentsByMethod) {
    byPaymentMethod[row.paymentMethod] += row._sum.amount ?? 0;
  }

  const receivedTotal = byPaymentMethod.CASH + byPaymentMethod.CARD + byPaymentMethod.PIX;
  const fiadoTotal = creditGivenOut._sum.amount ?? 0;
  const debtPaymentsTotal = debtPaymentsByMethod.reduce(
    (acc, row) => acc + (row._sum.amount ?? 0),
    0
  );

  return {
    soldTotal: receivedTotal - debtPaymentsTotal + fiadoTotal,
    fiadoTotal,
    debtPaymentsTotal,
    receivedTotal,
    byPaymentMethod,
    // only cash is expected to physically be in the drawer
    expectedAmount: openingAmount + byPaymentMethod.CASH,
  };
};

export { calculateCashRegisterTotals };
