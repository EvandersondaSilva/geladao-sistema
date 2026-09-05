import { Request, Response, NextFunction } from "express";
import prismaClient from "../prisma";
import { verifyToken } from "../auth/jwt";

// Like requireAuth, but never rejects — it only fills req.userId/req.userRole
// when a valid token is present, and silently leaves both unset otherwise.
// Exists solely for POST /users: that route also has to work with no token at
// all, for the one moment a fresh install has zero users and needs to create
// the first ADMIN. CreateUserService is what actually enforces the rule
// ("only an ADMIN calls this — unless the table is still empty").
const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);

    const user = await prismaClient.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, active: true },
    });

    if (user?.active) {
      req.userId = user.id;
      req.userRole = user.role;
    }
  } catch {
    // an invalid/expired token here is treated the same as no token — the
    // service below will demand a real ADMIN session once the table isn't empty
  }

  return next();
};

export { optionalAuth };
