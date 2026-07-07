import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateClientInput, UpdateClientInput } from "./client.schema";

export const findAll = async () => {
  return prisma.client.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
};

export const create = async (data: CreateClientInput) => {
  return prisma.client.create({ data });
};

export const update = async (id: number, data: UpdateClientInput) => {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError("Cliente no encontrado", 404);

  return prisma.client.update({ where: { id }, data });
};
