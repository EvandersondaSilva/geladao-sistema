import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

class GetOperatorPinStatusService {
  async execute() {
    try {
      const settings = await prismaClient.settings.findFirst({ select: { operatorPin: true } });

      return { configured: Boolean(settings?.operatorPin) };
    } catch (error) {
      throw new AppError("Falha ao verificar PIN do operador", 500);
    }
  }
}

export { GetOperatorPinStatusService };
