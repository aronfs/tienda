import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

export const findAll = async (companyId: number) => {
  return prisma.category.findMany({
    where: { active: true, companyId },
    orderBy: { name: "asc" },
  });
};

export const create = async (data: CreateCategoryInput, companyId: number) => {
  const existing = await prisma.category.findFirst({
    where: { name: data.name, companyId },
  });
  if (existing) throw new AppError("La categoría ya existe en esta empresa", 400);

  return prisma.category.create({
    data: {
      name: data.name,
      description: data.description || null,
      companyId,
    },
  });
};

export const update = async (id: number, data: UpdateCategoryInput, companyId: number) => {
  const category = await prisma.category.findFirst({ where: { id, companyId } });
  if (!category) throw new AppError("Categoría no encontrada", 404);

  return prisma.category.update({ where: { id }, data });
};

export const deactivate = async (id: number, companyId: number) => {
  const category = await prisma.category.findFirst({ where: { id, companyId } });
  if (!category) throw new AppError("Categoría no encontrada", 404);

  return prisma.category.update({
    where: { id },
    data: { active: false },
  });
};
