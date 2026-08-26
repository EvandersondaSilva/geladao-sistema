import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";

interface UpdateOperatorPinRequest {
  currentPin?: string;
  newPin: string;
}

class UpdateOperatorPinService {
  async execute({ currentPin, newPin }: UpdateOperatorPinRequest) {
    try {
      const settings = await prismaClient.settings.findFirst({ select: { id: true, operatorPin: true } });

      // a PIN already set can only be changed by proving you know it — otherwise
      // this route is a bootstrap step (first PIN ever configured), no proof needed
      if (settings?.operatorPin && currentPin !== settings.operatorPin) {
        throw new AppError("currentPin inválido", 401);
      }

      if (settings) {
        return await prismaClient.settings.update({
          where: { id: settings.id },
          data: { operatorPin: newPin },
          select: { id: true, updatedAt: true },
        });
      }

      return await prismaClient.settings.create({
        data: { operatorPin: newPin },
        select: { id: true, updatedAt: true },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Falha ao atualizar PIN do operador", 500);
    }
  }
}

export { UpdateOperatorPinService };
