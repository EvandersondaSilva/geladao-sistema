import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { calculateTabTotal } from "./calculateTabTotal";

class CancelTabService {
  async execute(id: string) {
    try {
      const tab = await prismaClient.$transaction(async (tx) => {
        const current = await tx.tab.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            items: { where: { cancelledAt: null }, select: { id: true } },
          },
        });

        if (!current) {
          throw new AppError("Comanda não encontrada", 404);
        }

        if (current.status === "CANCELLED") {
          throw new AppError("Comanda já foi cancelada", 409);
        }

        if (current.status !== "OPEN") {
          throw new AppError("Comanda já está fechada", 409);
        }

        // Cancelling never touches stock: an item still on the tab was already
        // taken out of it, so it has to be removed one by one (each removal
        // writing its own reversal) before the tab itself can be discarded.
        // That also stops a real tab with items from being voided in one click.
        if (current.items.length > 0) {
          throw new AppError(
            "Comanda ainda possui itens — remova cada item antes de cancelar",
            409
          );
        }

        // Deliberately NOT gated on an OPEN cash register. An empty tab survives
        // the register it was opened on, so requiring one would leave exactly the
        // tabs this endpoint exists to clean up stuck forever.
        return tx.tab.update({
          where: { id },
          data: { status: "CANCELLED", closedAt: new Date() },
          select: tabSelect,
        });
      });

      return { ...tab, total: calculateTabTotal(tab.items) };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao cancelar comanda", 500);
    }
  }
}

export { CancelTabService };
