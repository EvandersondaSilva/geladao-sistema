import jwt from "jsonwebtoken";

interface AuthPayload {
  sub: string; // userId
  role: "ADMIN" | "OPERATOR";
}

// One login lasts a shift, not indefinitely — an employee who is deactivated
// mid-shift is still cut off quickly because requireAuth re-checks `active` on
// every request; this expiry is just the outer bound on an otherwise-valid token.
const TOKEN_EXPIRES_IN = "12h";

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET não configurado");
  }

  return secret;
};

const signToken = (payload: AuthPayload): string =>
  jwt.sign(payload, getSecret(), { expiresIn: TOKEN_EXPIRES_IN });

const verifyToken = (token: string): AuthPayload => jwt.verify(token, getSecret()) as AuthPayload;

export { signToken, verifyToken };
export type { AuthPayload };
