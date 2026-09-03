import { Prisma } from "../../generated/prisma/client";
import { calculateRevenueTotals } from "../report/calculateRevenueTotals";

interface CalculateCashRegisterTotalsRequest {
  cashRegisterId: string;
  openingAmount: number;
}

// One shift's money: the shared revenue calculation narrowed to this register,
// plus the only figure that is specific to a shift — what has to be physically in
// the drawer. Only cash lands there, which is why credit given out never touches
// it and credit received does.
const calculateCashRegisterTotals = async (
  client: Prisma.TransactionClient,
  { cashRegisterId, openingAmount }: CalculateCashRegisterTotalsRequest
) => {
  const totals = await calculateRevenueTotals(client, { cashRegisterId });

  return { ...totals, expectedAmount: openingAmount + totals.byPaymentMethod.CASH };
};

export { calculateCashRegisterTotals };
