import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

export const findAll = async () => {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
};

export const create = async (data: CreateCategoryInput) => {
  const existing = await prisma.category.findUnique({
    where: { name: data.name },
  });
  if (existing) throw new AppError("La categoría ya existe", 400);

  return prisma.category.create({ data });
};

export const update = async (id: number, data: UpdateCategoryInput) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError("Categoría no encontrada", 404);

  return prisma.category.update({ where: { id }, data });
};

export const deactivate = async (id: number) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError("Categoría no encontrada", 404);

  return prisma.category.update({
    where: { id },
    data: { active: false },
  });
};
