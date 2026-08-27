import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { tabSelect } from "../../prisma/selects";
import { calculateTabTotal } from "./calculateTabTotal";

class GetTabService {
  async execute(id: string) {
    try {
      const tab = await prismaClient.tab.findUnique({
        where: { id },
        select: tabSelect,
      });

      if (!tab) {
        throw new AppError("Comanda não encontrada", 404);
      }

      return { ...tab, total: calculateTabTotal(tab.items) };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao buscar comanda", 500);
    }
  }
}

export { GetTabService };
