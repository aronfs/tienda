import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { AppError } from "../utils/appError";
import prisma from "../config/prisma";

export const authorize = (...permissions: string[]) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("No autenticado", 401));
      }

      const rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: req.user.roleId },
        include: { permission: true },
      });

      const userPermissions = rolePermissions.map(
        (rp) => rp.permission.name
      );

      const hasPermission = permissions.some((p) =>
        userPermissions.includes(p)
      );

      if (!hasPermission) {
        return next(
          new AppError("No tienes permisos para realizar esta acción", 403)
        );
      }

      next();
    } catch (error) {
      return next(new AppError("Error al verificar permisos", 500));
    }
  };
};

export const authorizeRole = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("No autenticado", 401));
    }

    if (!roles.includes(req.user.roleName)) {
      return next(
        new AppError("No tienes permisos para realizar esta acción", 403)
      );
    }

    next();
  };
};
