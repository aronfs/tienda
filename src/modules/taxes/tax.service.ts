import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import type { CreateTaxInput, UpdateTaxInput } from "./tax.schema";

async function getCompanyId(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  if (!user?.companyId) throw new AppError("No tienes empresa asignada", 400);
  return user.companyId;
}

export async function findAll(userId: number) {
  const companyId = await getCompanyId(userId);
  return prisma.tax.findMany({ where: { companyId }, orderBy: { isDefault: "desc" } });
}

export async function findDefault(userId: number) {
  const companyId = await getCompanyId(userId);
  const tax = await prisma.tax.findFirst({ where: { companyId, isDefault: true, isActive: true } });
  if (!tax) throw new AppError("No hay un impuesto default configurado", 404);
  return tax;
}

export async function create(data: CreateTaxInput, userId: number) {
  const companyId = await getCompanyId(userId);

  if (data.isDefault) {
    await prisma.tax.updateMany({ where: { companyId, isDefault: true }, data: { isDefault: false } });
  }

  return prisma.tax.create({
    data: {
      companyId,
      name: data.name,
      description: data.description || null,
      rate: data.rate,
      isDefault: data.isDefault,
      isActive: true,
      appliesTo: data.appliesTo as any,
    },
  });
}

export async function update(id: number, data: UpdateTaxInput, userId: number) {
  const companyId = await getCompanyId(userId);
  const tax = await prisma.tax.findFirst({ where: { id, companyId } });
  if (!tax) throw new AppError("Impuesto no encontrado", 404);

  if (data.isDefault) {
    await prisma.tax.updateMany({ where: { companyId, isDefault: true }, data: { isDefault: false } });
  }

  return prisma.tax.update({ where: { id }, data });
}

export async function updateStatus(id: number, isActive: boolean, userId: number) {
  const companyId = await getCompanyId(userId);
  const tax = await prisma.tax.findFirst({ where: { id, companyId } });
  if (!tax) throw new AppError("Impuesto no encontrado", 404);
  if (tax.isDefault && !isActive) throw new AppError("No se puede desactivar el impuesto default", 400);

  return prisma.tax.update({ where: { id }, data: { isActive } });
}

export async function setDefault(id: number, userId: number) {
  const companyId = await getCompanyId(userId);
  const tax = await prisma.tax.findFirst({ where: { id, companyId } });
  if (!tax) throw new AppError("Impuesto no encontrado", 404);

  return prisma.$transaction(async (tx) => {
    await tx.tax.updateMany({ where: { companyId, isDefault: true }, data: { isDefault: false } });
    return tx.tax.update({ where: { id }, data: { isDefault: true, isActive: true } });
  });
}

export async function remove(id: number, userId: number) {
  const companyId = await getCompanyId(userId);
  const tax = await prisma.tax.findFirst({ where: { id, companyId } });
  if (!tax) throw new AppError("Impuesto no encontrado", 404);

  const usedInSales = await prisma.saleDetail.findFirst({ where: { taxId: id } });
  if (usedInSales) throw new AppError("No se puede eliminar un impuesto usado en ventas", 400);

  return prisma.tax.delete({ where: { id } });
}