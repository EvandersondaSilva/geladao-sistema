import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { debtSelect } from "../../prisma/selects";
import { calculateDebtBalance } from "./calculateDebtBalance";

interface ListDebtRequest {
  status?: "OPEN" | "PAID";
  customerId?: string;
}

class ListDebtService {
  async execute({ status, customerId }: ListDebtRequest) {
    try {
      const debts = await prismaClient.debt.findMany({
        where: {
          ...(status && { status }),
          ...(customerId && { customerId }),
        },
        select: debtSelect,
        // oldest first: on a debtor list, the one that has been owed longest is
        // the one worth looking at
        orderBy: { createdAt: "asc" },
      });

      return debts.map((debt) => ({ ...debt, balance: calculateDebtBalance(debt) }));
    } catch (error) {
      throw new AppError("Falha ao listar fiados", 500);
    }
  }
}

export { ListDebtService };
