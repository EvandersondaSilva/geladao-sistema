import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { debtSelect } from "../../prisma/selects";
import { calculateDebtBalance } from "./calculateDebtBalance";

interface PayDebtRequest {
  id: string;
  amount: number;
  paymentMethod: "CASH" | "CARD" | "PIX";
  cashRegisterId: string;
  receivedById: string;
}

class PayDebtService {
  async execute({ id, amount, paymentMethod, cashRegisterId, receivedById }: PayDebtRequest) {
    try {
      const debt = await prismaClient.$transaction(async (tx) => {
        const current = await tx.debt.findUnique({
          where: { id },
          select: { id: true, status: true, amount: true, payments: { select: { amount: true } } },
        });

        if (!current) {
          throw new AppError("Fiado não encontrado", 404);
        }

        if (current.status === "PAID") {
          throw new AppError("Fiado já está quitado", 409);
        }

        // Money is physically coming in, so unlike giving credit out, this does
        // need an open register — it is what makes the drawer add up at closing.
        const cashRegister = await tx.cashRegister.findUnique({
          where: { id: cashRegisterId },
          select: { id: true, status: true },
        });

        if (!cashRegister) {
          throw new AppError("Caixa não encontrado", 404);
        }

        if (cashRegister.status !== "OPEN") {
          throw new AppError("Caixa não está aberto", 409);
        }

        const balance = calculateDebtBalance(current);

        if (amount > balance) {
          throw new AppError(
            `Valor maior que o saldo devedor: saldo ${balance}, informado ${amount}`,
            409
          );
        }

        await tx.debtPayment.create({
          data: { debtId: id, amount, paymentMethod, cashRegisterId, receivedById },
        });

        // partial payments are allowed, so the debt only closes when nothing is left
        const settled = balance - amount === 0;

        return tx.debt.update({
          where: { id },
          data: settled ? { status: "PAID", paidAt: new Date() } : {},
          select: debtSelect,
        });
      });

      return { ...debt, balance: calculateDebtBalance(debt) };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao registrar pagamento de fiado", 500);
    }
  }
}

export { PayDebtService };
