import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

// Runs after requireAuth in the chain — depends on req.userRole already
// being set by it.
const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.userRole !== "ADMIN") {
    throw new AppError("Ação restrita a administradores", 403);
  }

  return next();
};

export { requireAdmin };
