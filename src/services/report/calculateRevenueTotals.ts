import { Prisma } from "../../generated/prisma/client";
import { calculateTabTotal } from "../tab/calculateTabTotal";

type PaymentMethodTotals = Record<"CASH" | "CARD" | "PIX", number>;

interface RevenueScope {
  cashRegisterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface RevenueTotals {
  soldTotal: number;
  fiadoTotal: number;
  debtPaymentsTotal: number;
  receivedTotal: number;
  byPaymentMethod: PaymentMethodTotals;
}

// The money side of the business, for one shift OR for a date range — the same
// implementation either way, so a monthly report can never disagree with the
// shifts it is made of.
//
// Fiado is why there is more than one total. Goods handed out on credit were SOLD
// but not RECEIVED, and credit from an earlier day settled now was RECEIVED but
// not sold now. One combined figure would either double count (the same money on
// the day it sold and again on the day it was paid) or leave the drawer short:
//
//   soldTotal = receivedTotal - debtPaymentsTotal + fiadoTotal
//
// `PaymentMethod` deliberately has no FIADO member, so every sum over it is money
// that actually arrived.
const calculateRevenueTotals = async (
  client: Prisma.TransactionClient,
  { cashRegisterId, dateFrom, dateTo }: RevenueScope
): Promise<RevenueTotals> => {
  const inRange = dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined;
  const ofRegister = cashRegisterId ? { cashRegisterId } : {};

  const [salesByMethod, closedTabs, creditGivenOut, debtPaymentsByMethod] = await Promise.all([
    client.sale.groupBy({
      by: ["paymentMethod"],
      where: { ...ofRegister, ...(inRange && { createdAt: inRange }) },
      _sum: { total: true },
    }),
    client.tab.findMany({
      // a tab is revenue when it is settled, so it lands on closedAt, not openedAt
      where: { status: "CLOSED", ...ofRegister, ...(inRange && { closedAt: inRange }) },
      select: {
        paymentMethod: true,
        items: { where: { cancelledAt: null }, select: { quantity: true, unitPrice: true } },
      },
    }),
    client.debt.aggregate({
      where: { ...ofRegister, ...(inRange && { createdAt: inRange }) },
      _sum: { amount: true },
    }),
    client.debtPayment.groupBy({
      by: ["paymentMethod"],
      where: { ...ofRegister, ...(inRange && { createdAt: inRange }) },
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
  };
};

export { calculateRevenueTotals };
