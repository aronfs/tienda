import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/appError";
import prisma from "../config/prisma";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    roleId: number;
    roleName: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Token de autenticación requerido", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, active: true },
      include: { role: true },
    });

    if (!user) {
      return next(new AppError("Usuario no encontrado o inactivo", 401));
    }

    req.user = {
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
    };

    next();
  } catch (error) {
    return next(new AppError("Token inválido o expirado", 401));
  }
};
