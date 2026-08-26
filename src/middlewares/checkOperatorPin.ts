import { Request, Response, NextFunction } from "express";
import prismaClient from "../prisma";
import { AppError } from "../errors/AppError";

const checkOperatorPin = async (req: Request, _res: Response, next: NextFunction) => {
  const settings = await prismaClient.settings.findFirst({ select: { operatorPin: true } });

  if (!settings?.operatorPin) {
    throw new AppError("PIN do operador não configurado", 503);
  }

  const providedPin = req.header("x-operator-pin");

  if (providedPin !== settings.operatorPin) {
    throw new AppError("PIN do operador inválido", 401);
  }

  return next();
};

export { checkOperatorPin };
