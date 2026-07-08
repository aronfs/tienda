import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../utils/appError";
import { generateToken } from "../../utils/jwt";
import { RegisterInput, LoginInput } from "./auth.schema";

export const registerUser = async (data: RegisterInput) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError("El correo ya está registrado", 400);
  }

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role || !role.active) {
    throw new AppError("Rol no válido", 400);
  }

  const hashedPassword = await bcrypt.hash(data.password, env.bcryptSaltRounds);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      roleId: data.roleId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  return user;
};

export const loginUser = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { role: true },
  });

  if (!user) {
    throw new AppError("Credenciales inválidas", 401);
  }

  if (!user.active) {
    throw new AppError("Usuario inactivo", 401);
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Credenciales inválidas", 401);
  }

  const token = generateToken({
    userId: user.id,
    roleId: user.roleId,
    roleName: user.role.name,
  });

  const company = user.companyId ? await prisma.company.findUnique({ where: { id: user.companyId }, select: { id: true, legalName: true, taxId: true, status: true } }) : null;

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: { id: user.role.id, name: user.role.name },
      companyId: user.companyId,
      branchId: user.branchId,
      company,
    },
  };
};

export const getMe = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: {
        select: {
          id: true,
          name: true,
          rolePermissions: {
            select: { permission: { select: { name: true } } },
          },
        },
      },
      companyId: true,
      branchId: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return user;
};
