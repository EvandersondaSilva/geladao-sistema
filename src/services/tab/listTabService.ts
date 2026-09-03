import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { presentTab } from "./presentTab";

interface ListTabRequest {
  status?: "OPEN" | "CLOSED" | "CANCELLED";
  // "show me only tabs open for longer than N hours" — the forgotten-tab alert
  staleHours?: number;
}

class ListTabService {
  async execute({ status, staleHours }: ListTabRequest) {
    try {
      const tabs = await prismaClient.tab.findMany({
        where: {
          ...(status && { status }),
          ...(staleHours !== undefined && {
            openedAt: { lte: new Date(Date.now() - staleHours * 60 * 60 * 1000) },
          }),
        },
        select: tabSelect,
        orderBy: { openedAt: "desc" },
      });

      return tabs.map(presentTab);
    } catch (error) {
      throw new AppError("Falha ao listar comandas", 500);
    }
  }
}

export { ListTabService };
