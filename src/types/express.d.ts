// Augments Express.Request with the identity requireAuth attaches after
// verifying the token, so controllers/middlewares read req.userId/req.userRole
// with real types instead of `any`.
declare namespace Express {
  export interface Request {
    userId?: string;
    userRole?: "ADMIN" | "OPERATOR";
  }
}
