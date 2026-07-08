import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import type { CreateBranchInput, UpdateBranchInput } from "./branch.schema";

async function getCompanyId(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  if (!user?.companyId) throw new AppError("No tienes empresa asignada", 400);
  return user.companyId;
}

export async function findAll(userId: number) {
  const companyId = await getCompanyId(userId);
  return prisma.branch.findMany({
    where: { companyId },
    orderBy: { isMain: "desc" },
  });
}

export async function findById(id: number, userId: number) {
  const companyId = await getCompanyId(userId);
  const branch = await prisma.branch.findFirst({ where: { id, companyId } });
  if (!branch) throw new AppError("Sucursal no encontrada", 404);
  return branch;
}

export async function create(data: CreateBranchInput, userId: number) {
  const companyId = await getCompanyId(userId);

  const existing = await prisma.branch.findUnique({ where: { companyId_code: { companyId, code: data.code } } });
  if (existing) throw new AppError("El código de sucursal ya existe en esta empresa", 400);

  if (data.isMain) {
    await prisma.branch.updateMany({ where: { companyId, isMain: true }, data: { isMain: false } });
  }

  return prisma.branch.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      address: data.address || null,
      city: data.city || null,
      country: data.country || null,
      phone: data.phone || null,
      email: data.email || null,
      managerName: data.managerName || null,
      isMain: data.isMain,
    },
  });
}

export async function update(id: number, data: UpdateBranchInput, userId: number) {
  const companyId = await getCompanyId(userId);
  const branch = await prisma.branch.findFirst({ where: { id, companyId } });
  if (!branch) throw new AppError("Sucursal no encontrada", 404);

  if (data.code && data.code !== branch.code) {
    const existing = await prisma.branch.findUnique({ where: { companyId_code: { companyId, code: data.code } } });
    if (existing) throw new AppError("El código de sucursal ya existe", 400);
  }

  return prisma.branch.update({ where: { id }, data });
}

export async function setMain(id: number, userId: number) {
  const companyId = await getCompanyId(userId);
  const branch = await prisma.branch.findFirst({ where: { id, companyId } });
  if (!branch) throw new AppError("Sucursal no encontrada", 404);

  return prisma.$transaction(async (tx) => {
    await tx.branch.updateMany({ where: { companyId, isMain: true }, data: { isMain: false } });
    return tx.branch.update({ where: { id }, data: { isMain: true } });
  });
}

export async function updateStatus(id: number, status: string, userId: number) {
  const companyId = await getCompanyId(userId);
  const branch = await prisma.branch.findFirst({ where: { id, companyId } });
  if (!branch) throw new AppError("Sucursal no encontrada", 404);

  return prisma.branch.update({ where: { id }, data: { status: status as any } });
}

export async function remove(id: number, userId: number) {
  const companyId = await getCompanyId(userId);
  const branch = await prisma.branch.findFirst({ where: { id, companyId } });
  if (!branch) throw new AppError("Sucursal no encontrada", 404);
  if (branch.isMain) throw new AppError("No se puede eliminar la sucursal principal", 400);

  const hasSales = await prisma.sale.findFirst({ where: { branchId: id } });
  if (hasSales) throw new AppError("No se puede eliminar una sucursal con ventas", 400);

  return prisma.branch.delete({ where: { id } });
}