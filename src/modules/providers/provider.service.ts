import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateProviderInput, UpdateProviderInput } from "./provider.schema";

export const findAll = async (companyId: number) => {
  return prisma.provider.findMany({
    where: { active: true, companyId },
    orderBy: { name: "asc" },
  });
};

export const create = async (data: CreateProviderInput, companyId: number) => {
  const existing = await prisma.provider.findFirst({
    where: { name: data.name, companyId },
  });
  if (existing) throw new AppError("El proveedor ya existe en esta empresa", 400);

  return prisma.provider.create({
    data: {
      name: data.name,
      contact: data.contact || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      companyId,
    },
  });
};

export const update = async (id: number, data: UpdateProviderInput, companyId: number) => {
  const provider = await prisma.provider.findFirst({ where: { id, companyId } });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  return prisma.provider.update({ where: { id }, data });
};

export const deactivate = async (id: number, companyId: number) => {
  const provider = await prisma.provider.findFirst({ where: { id, companyId } });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  return prisma.provider.update({
    where: { id },
    data: { active: false },
  });
};
