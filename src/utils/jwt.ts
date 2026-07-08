import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface TokenPayload {
  userId: number;
  roleId: number;
  roleName: string;
  companyId: number | null;
  branchId: number | null;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
};
