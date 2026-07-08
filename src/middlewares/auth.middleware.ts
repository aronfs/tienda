import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/appError";
import prisma from "../config/prisma";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    roleId: number;
    roleName: string;
    companyId: number | null;
    branchId: number | null;
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
      companyId: user.companyId,
      branchId: user.branchId,
    };

    next();
  } catch (error) {
    return next(new AppError("Token inválido o expirado", 401));
  }
};

export const requireCompany = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user?.companyId) {
    return next(new AppError("Debe configurar la empresa antes de usar este módulo. Use GET /api/setup/status para verificar.", 400));
  }
  next();
};

export const requireBranch = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user?.branchId) {
    return next(new AppError("Debe estar asociado a una sucursal para usar este módulo.", 400));
  }
  next();
};
