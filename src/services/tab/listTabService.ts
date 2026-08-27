import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { calculateTabTotal } from "./calculateTabTotal";

class ListTabService {
  async execute(status?: "OPEN" | "CLOSED") {
    try {
      const tabs = await prismaClient.tab.findMany({
        where: { ...(status && { status }) },
        select: tabSelect,
        orderBy: { openedAt: "desc" },
      });

      return tabs.map((tab) => ({ ...tab, total: calculateTabTotal(tab.items) }));
    } catch (error) {
      throw new AppError("Falha ao listar comandas", 500);
    }
  }
}

export { ListTabService };
