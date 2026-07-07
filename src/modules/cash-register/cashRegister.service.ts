import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";

export const openRegister = async (userId: number, initialAmount: number) => {
  const openRegister = await prisma.cashRegister.findFirst({
    where: { userId, status: "ABIERTA" },
  });

  if (openRegister) {
    throw new AppError("Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.", 400);
  }

  const register = await prisma.cashRegister.create({
    data: {
      userId,
      initialAmount,
      status: "ABIERTA",
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "OPEN",
      entity: "CASH_REGISTER",
      entityId: register.id,
      detail: `Caja abierta con monto inicial: ${initialAmount}`,
    },
  });

  return register;
};

export const closeRegister = async (
  userId: number,
  actualTotal: number,
  observations?: string
) => {
  const register = await prisma.cashRegister.findFirst({
    where: { userId, status: "ABIERTA" },
  });

  if (!register) {
    throw new AppError("No tienes una caja abierta", 400);
  }

  const expectedTotal = register.initialAmount + register.totalSales - register.totalExpenses;
  const difference = actualTotal - expectedTotal;

  const updated = await prisma.cashRegister.update({
    where: { id: register.id },
    data: {
      closingDate: new Date(),
      expectedTotal,
      actualTotal,
      difference,
      observations: observations || null,
      status: "CERRADA",
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CLOSE",
      entity: "CASH_REGISTER",
      entityId: register.id,
      detail: `Caja cerrada. Esperado: ${expectedTotal}, Real: ${actualTotal}, Diferencia: ${difference}`,
    },
  });

  return updated;
};

export const getCurrent = async (userId: number) => {
  const register = await prisma.cashRegister.findFirst({
    where: { userId, status: "ABIERTA" },
    include: {
      movements: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true } },
    },
  });

  return register;
};

export const getHistory = async () => {
  return prisma.cashRegister.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: { openingDate: "desc" },
    take: 50,
  });
};
