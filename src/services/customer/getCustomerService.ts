import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { customerSelect, debtSelect } from "../../prisma/selects";
import { calculateDebtBalance } from "../debt/calculateDebtBalance";

class GetCustomerService {
  async execute(id: string) {
    try {
      const customer = await prismaClient.customer.findUnique({
        where: { id },
        select: {
          ...customerSelect,
          debts: { select: debtSelect, orderBy: { createdAt: "desc" } },
        },
      });

      if (!customer) {
        throw new AppError("Cliente não encontrado", 404);
      }

      // the customer's statement: every debt with what is still owed on it
      const debts = customer.debts.map((debt) => ({
        ...debt,
        balance: calculateDebtBalance(debt),
      }));

      return {
        ...customer,
        debts,
        totalOwed: debts.reduce(
          (acc, debt) => (debt.status === "OPEN" ? acc + debt.balance : acc),
          0
        ),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao buscar cliente", 500);
    }
  }
}

export { GetCustomerService };
