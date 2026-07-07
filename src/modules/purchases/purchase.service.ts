import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreatePurchaseInput } from "./purchase.schema";

export const findAll = async () => {
  return prisma.purchase.findMany({
    include: {
      provider: { select: { id: true, name: true } },
      details: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findById = async (id: number) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      provider: { select: { id: true, name: true } },
      details: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  if (!purchase) throw new AppError("Compra no encontrada", 404);
  return purchase;
};

export const create = async (data: CreatePurchaseInput, userId: number) => {
  const provider = await prisma.provider.findUnique({
    where: { id: data.providerId },
  });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  for (const detail of data.details) {
    const product = await prisma.product.findUnique({
      where: { id: detail.productId },
    });
    if (!product) throw new AppError(`Producto ID ${detail.productId} no encontrado`, 404);
    if (!product.active) throw new AppError(`Producto ${product.name} está inactivo`, 400);
  }

  const detailsWithSubtotals = data.details.map((d) => ({
    ...d,
    subtotal: d.quantity * d.unitCost,
  }));

  const subtotal = detailsWithSubtotals.reduce((sum, d) => sum + d.subtotal, 0);
  const tax = 0;
  const total = subtotal + tax;

  const purchase = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        providerId: data.providerId,
        series: data.series || "OC",
        number: data.number,
        subtotal,
        tax,
        total,
        details: {
          create: detailsWithSubtotals.map((d) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitCost: d.unitCost,
            subtotal: d.subtotal,
          })),
        },
      },
      include: {
        provider: { select: { id: true, name: true } },
        details: {
          include: { product: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    for (const detail of detailsWithSubtotals) {
      const product = await tx.product.findUnique({
        where: { id: detail.productId },
      });

      await tx.product.update({
        where: { id: detail.productId },
        data: { stock: { increment: detail.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: detail.productId,
          userId,
          type: "PURCHASE_IN",
          quantity: detail.quantity,
          stockBefore: product!.stock,
          stockAfter: product!.stock + detail.quantity,
          reference: "PURCHASE",
          referenceId: purchase.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entity: "PURCHASE",
        entityId: purchase.id,
        detail: `Compra creada por ${total} a proveedor ${provider.name}`,
      },
    });

    return purchase;
  });

  return purchase;
};
