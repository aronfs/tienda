import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateProductInput, UpdateProductInput } from "./product.schema";

export const findAll = async () => {
  return prisma.product.findMany({
    where: { active: true },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
};

export const findById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
  });

  if (!product) throw new AppError("Producto no encontrado", 404);
  return product;
};

export const findByCode = async (code: string) => {
  return prisma.product.findUnique({
    where: { code },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
  });
};

export const create = async (data: CreateProductInput) => {
  const existingCode = await prisma.product.findUnique({
    where: { code: data.code },
  });
  if (existingCode) throw new AppError("El código de producto ya existe", 400);

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) throw new AppError("Categoría no encontrada", 404);

  const provider = await prisma.provider.findUnique({
    where: { id: data.providerId },
  });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  return prisma.product.create({ data });
};

export const update = async (id: number, data: UpdateProductInput) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Producto no encontrado", 404);

  if (data.code) {
    const existing = await prisma.product.findFirst({
      where: { code: data.code, id: { not: id } },
    });
    if (existing) throw new AppError("El código de producto ya existe", 400);
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

export const deactivate = async (id: number) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Producto no encontrado", 404);

  return prisma.product.update({
    where: { id },
    data: { active: false },
  });
};

export const getLowStock = async () => {
  return prisma.product.findMany({
    where: {
      active: true,
      stock: { lte: prisma.product.fields.minStock },
    },
    include: {
      category: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
    },
    orderBy: { stock: "asc" },
  });
};
