import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateProviderInput, UpdateProviderInput } from "./provider.schema";

export const findAll = async () => {
  return prisma.provider.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
};

export const create = async (data: CreateProviderInput) => {
  return prisma.provider.create({ data });
};

export const update = async (id: number, data: UpdateProviderInput) => {
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  return prisma.provider.update({ where: { id }, data });
};

export const deactivate = async (id: number) => {
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  return prisma.provider.update({
    where: { id },
    data: { active: false },
  });
};
