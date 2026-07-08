import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateClientInput, UpdateClientInput } from "./client.schema";

export const findAll = async (companyId: number) => {
  return prisma.client.findMany({
    where: { active: true, companyId },
    orderBy: { name: "asc" },
  });
};

export const create = async (data: CreateClientInput, companyId: number) => {
  const existingName = await prisma.client.findFirst({
    where: { name: data.name, companyId },
  });
  if (existingName) throw new AppError("El nombre de cliente ya existe en esta empresa", 400);

  if (data.docNumber) {
    const existingDoc = await prisma.client.findFirst({
      where: { docNumber: data.docNumber, companyId },
    });
    if (existingDoc) throw new AppError("El número de documento ya existe en esta empresa", 400);
  }

  return prisma.client.create({
    data: {
      name: data.name,
      docType: data.docType || "DNI",
      docNumber: data.docNumber || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      companyId,
    },
  });
};

export const update = async (id: number, data: UpdateClientInput, companyId: number) => {
  const client = await prisma.client.findFirst({ where: { id, companyId } });
  if (!client) throw new AppError("Cliente no encontrado", 404);

  return prisma.client.update({ where: { id }, data });
};
