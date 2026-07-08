import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import type { BillingConfigInput, CreateResolutionInput, UpdateResolutionInput } from "./billing.schema";

async function getCompanyId(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } });
  if (!user?.companyId) throw new AppError("No tienes empresa asignada", 400);
  return user.companyId;
}

export async function getConfig(userId: number) {
  const companyId = await getCompanyId(userId);
  const config = await prisma.billingConfig.findUnique({ where: { companyId } });
  if (!config) throw new AppError("Configuración de facturación no encontrada", 404);
  return config;
}

export async function updateConfig(userId: number, data: BillingConfigInput) {
  const companyId = await getCompanyId(userId);
  return prisma.billingConfig.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });
}

export async function getResolutions(userId: number) {
  const companyId = await getCompanyId(userId);
  return prisma.invoiceResolution.findMany({
    where: { companyId },
    include: { branch: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResolution(id: number, userId: number) {
  const companyId = await getCompanyId(userId);
  const resolution = await prisma.invoiceResolution.findFirst({
    where: { id, companyId },
    include: { branch: { select: { id: true, name: true, code: true } } },
  });
  if (!resolution) throw new AppError("Resolución no encontrada", 404);
  return resolution;
}

export async function createResolution(data: CreateResolutionInput, userId: number) {
  const companyId = await getCompanyId(userId);

  if (data.endNumber <= data.startNumber) {
    throw new AppError("endNumber debe ser mayor que startNumber", 400);
  }
  if (data.currentNumber < data.startNumber || data.currentNumber > data.endNumber) {
    throw new AppError("currentNumber debe estar entre startNumber y endNumber", 400);
  }

  const existing = await prisma.invoiceResolution.findFirst({
    where: { companyId, prefix: data.prefix, status: "ACTIVE" },
  });
  if (existing) throw new AppError("Ya existe una resolución activa con este prefijo", 400);

  return prisma.invoiceResolution.create({
    data: {
      companyId,
      branchId: data.branchId || null,
      prefix: data.prefix,
      startNumber: data.startNumber,
      endNumber: data.endNumber,
      currentNumber: data.currentNumber,
      authorizationCode: data.authorizationCode || null,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      status: "ACTIVE",
    },
  });
}

export async function updateResolution(id: number, data: UpdateResolutionInput, userId: number) {
  const companyId = await getCompanyId(userId);
  const resolution = await prisma.invoiceResolution.findFirst({ where: { id, companyId } });
  if (!resolution) throw new AppError("Resolución no encontrada", 404);

  return prisma.invoiceResolution.update({ where: { id }, data });
}

export async function updateResolutionStatus(id: number, status: string, userId: number) {
  const companyId = await getCompanyId(userId);
  const resolution = await prisma.invoiceResolution.findFirst({ where: { id, companyId } });
  if (!resolution) throw new AppError("Resolución no encontrada", 404);

  return prisma.invoiceResolution.update({ where: { id }, data: { status: status as any } });
}

export async function deleteResolution(id: number, userId: number) {
  const companyId = await getCompanyId(userId);
  const resolution = await prisma.invoiceResolution.findFirst({ where: { id, companyId } });
  if (!resolution) throw new AppError("Resolución no encontrada", 404);

  const hasSales = await prisma.sale.findFirst({ where: { invoiceResolutionId: id } });
  if (hasSales) throw new AppError("No se puede eliminar una resolución usada en ventas", 400);

  return prisma.invoiceResolution.delete({ where: { id } });
}

export async function getNextInvoiceNumber(userId: number) {
  const companyId = await getCompanyId(userId);
  const config = await prisma.billingConfig.findUnique({ where: { companyId } });
  if (!config) throw new AppError("Configuración de facturación no encontrada", 404);

  if (!config.autoGenerateInvoiceNumber) {
    throw new AppError("La generación automática de facturas está desactivada", 400);
  }

  const resolution = await prisma.invoiceResolution.findFirst({
    where: { companyId, status: "ACTIVE" },
    orderBy: { currentNumber: "desc" },
  });

  if (!resolution) {
    throw new AppError("No hay una resolución fiscal activa", 400);
  }

  if (resolution.currentNumber >= resolution.endNumber) {
    throw new AppError("La resolución fiscal ha agotado su numeración", 400);
  }

  if (new Date(resolution.validUntil) < new Date()) {
    throw new AppError("La resolución fiscal está vencida", 400);
  }

  return {
    prefix: resolution.prefix,
    nextNumber: resolution.currentNumber + 1,
    resolutionId: resolution.id,
    fullInvoiceNumber: `${resolution.prefix}-${String(resolution.currentNumber + 1).padStart(8, "0")}`,
  };
}