import bcrypt from "bcryptjs";
import prisma from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../utils/appError";
import { CreateUserInput, UpdateUserInput } from "./user.schema";

export const findAll = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });
};

export const findById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  if (!user) throw new AppError("Usuario no encontrado", 404);
  return user;
};

export const create = async (data: CreateUserInput) => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new AppError("El correo ya está registrado", 400);

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role || !role.active) throw new AppError("Rol no válido", 400);

  const hashedPassword = await bcrypt.hash(data.password, env.bcryptSaltRounds);

  return prisma.user.create({
    data: { ...data, password: hashedPassword },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
};

export const update = async (id: number, data: UpdateUserInput) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, id: { not: id } },
    });
    if (existing) throw new AppError("El correo ya está en uso", 400);
  }

  const updateData: any = { ...data };
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, env.bcryptSaltRounds);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { id: true, name: true } },
    },
  });
};

export const deactivate = async (id: number) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  return prisma.user.update({
    where: { id },
    data: { active: false },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
    },
  });
};
