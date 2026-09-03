import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { customerSelect } from "../../prisma/selects";
import { calculateDebtBalance } from "../debt/calculateDebtBalance";

class ListCustomerService {
  async execute(search?: string) {
    try {
      const customers = await prismaClient.customer.findMany({
        where: {
          ...(search && { name: { contains: search, mode: "insensitive" } }),
        },
        select: {
          ...customerSelect,
          // only the open ones — a paid-off debt is history, not a balance
          debts: {
            where: { status: "OPEN" },
            select: { amount: true, payments: { select: { amount: true } } },
          },
        },
        orderBy: { name: "asc" },
      });

      // every list of customers is really "who owes me", so the balance comes
      // along instead of forcing a second call per customer
      return customers.map(({ debts, ...customer }) => ({
        ...customer,
        totalOwed: debts.reduce((acc, debt) => acc + calculateDebtBalance(debt), 0),
      }));
    } catch (error) {
      throw new AppError("Falha ao listar clientes", 500);
    }
  }
}

export { ListCustomerService };
