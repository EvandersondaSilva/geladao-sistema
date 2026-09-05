import { Request, Response, NextFunction } from "express";
import prismaClient from "../prisma";
import { AppError } from "../errors/AppError";
import { verifyToken } from "../auth/jwt";

const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    throw new AppError("Login necessário", 401);
  }

  let payload;

  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError("Sessão inválida ou expirada — faça login novamente", 401);
  }

  // A DB lookup on every request, not just trusting the signed token, is on
  // purpose: it is what makes deactivating an employee take effect immediately
  // instead of only after their token expires up to 12h later.
  const user = await prismaClient.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, active: true },
  });

  if (!user || !user.active) {
    throw new AppError("Sessão inválida ou expirada — faça login novamente", 401);
  }

  req.userId = user.id;
  req.userRole = user.role;

  return next();
};

export { requireAuth };
