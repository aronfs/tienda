import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import type { UpdateCompanyInput } from "./company.schema";

export async function getMyCompany(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  if (!user?.companyId) throw new AppError("No tienes empresa asignada", 404);

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    include: { regionalConfig: true, billingConfig: true },
  });
  if (!company) throw new AppError("Empresa no encontrada", 404);
  return company;
}

export async function updateMyCompany(userId: number, data: UpdateCompanyInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  if (!user?.companyId) throw new AppError("No tienes empresa asignada", 404);

  return prisma.company.update({
    where: { id: user.companyId },
    data,
  });
}

export async function updateLogo(userId: number, logoUrl: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  if (!user?.companyId) throw new AppError("No tienes empresa asignada", 404);

  return prisma.company.update({
    where: { id: user.companyId },
    data: { logoUrl },
    select: { id: true, legalName: true, logoUrl: true },
  });
}