import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateProductInput, UpdateProductInput } from "./product.schema";

export const findAll = async (companyId: number, branchId?: number | null) => {
  return prisma.product.findMany({
    where: { active: true, companyId },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
};

export const findById = async (id: number, companyId: number) => {
  const product = await prisma.product.findFirst({
    where: { id, companyId },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
  });

  if (!product) throw new AppError("Producto no encontrado", 404);
  return product;
};

export const findByCode = async (code: string, companyId: number) => {
  return prisma.product.findFirst({
    where: { code, companyId },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
  });
};

export const create = async (data: CreateProductInput, companyId: number, branchId: number | null, userId: number) => {
  const existingCode = await prisma.product.findFirst({
    where: { code: data.code, companyId },
  });
  if (existingCode) throw new AppError("El código de producto ya existe en esta empresa", 400);

  if (data.barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: { barcode: data.barcode, companyId },
    });
    if (existingBarcode) throw new AppError("El código de barras ya existe en esta empresa", 400);
  }

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, companyId },
  });
  if (!category) throw new AppError("Categoría no encontrada o no pertenece a esta empresa", 404);

  const provider = await prisma.provider.findFirst({
    where: { id: data.providerId, companyId },
  });
  if (!provider) throw new AppError("Proveedor no encontrado o no pertenece a esta empresa", 404);

  if (data.taxId) {
    const tax = await prisma.tax.findFirst({
      where: { id: data.taxId, companyId },
    });
    if (!tax) throw new AppError("Impuesto no encontrado o no pertenece a esta empresa", 404);
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        code: data.code,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId,
        providerId: data.providerId,
        companyId,
        taxId: data.taxId || null,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
        stock: data.stock || 0,
        minStock: data.minStock || 0,
      },
    });

    if ((data.stock || 0) > 0 && branchId) {
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          userId,
          type: "ADJUSTMENT",
          quantity: data.stock || 0,
          stockBefore: 0,
          stockAfter: data.stock || 0,
          reference: "INITIAL",
          note: "Stock inicial",
          companyId,
          branchId,
        },
      });
    }

    return product;
  });
};

export const update = async (id: number, data: UpdateProductInput, companyId: number) => {
  const product = await prisma.product.findFirst({ where: { id, companyId } });
  if (!product) throw new AppError("Producto no encontrado", 404);

  if (data.code) {
    const existing = await prisma.product.findFirst({
      where: { code: data.code, companyId, id: { not: id } },
    });
    if (existing) throw new AppError("El código de producto ya existe en esta empresa", 400);
  }

  if (data.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: data.categoryId, companyId } });
    if (!category) throw new AppError("Categoría no pertenece a esta empresa", 400);
  }

  if (data.providerId) {
    const provider = await prisma.provider.findFirst({ where: { id: data.providerId, companyId } });
    if (!provider) throw new AppError("Proveedor no pertenece a esta empresa", 400);
  }

  if (data.taxId) {
    const tax = await prisma.tax.findFirst({ where: { id: data.taxId, companyId } });
    if (!tax) throw new AppError("Impuesto no pertenece a esta empresa", 400);
  }

  return prisma.product.update({
    where: { id },
    data,
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
  });
};

export const deactivate = async (id: number, companyId: number) => {
  const product = await prisma.product.findFirst({ where: { id, companyId } });
  if (!product) throw new AppError("Producto no encontrado", 404);

  return prisma.product.update({
    where: { id },
    data: { active: false },
  });
};

export const getLowStock = async (companyId: number) => {
  return prisma.product.findMany({
    where: {
      active: true,
      companyId,
      stock: { lte: prisma.product.fields.minStock },
    },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
    orderBy: { stock: "asc" },
  });
};
