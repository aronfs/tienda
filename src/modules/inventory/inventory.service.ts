import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { InventoryAdjustInput } from "./inventory.schema";

export const getMovements = async () => {
  return prisma.inventoryMovement.findMany({
    include: {
      product: { select: { id: true, name: true, code: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
};

export const adjust = async (data: InventoryAdjustInput, userId: number) => {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) throw new AppError("Producto no encontrado", 404);

  const newStock = product.stock + data.quantity;

  if (newStock < 0) {
    throw new AppError("El stock no puede ser negativo", 400);
  }

  const movement = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: data.productId },
      data: { stock: newStock },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        userId,
        type: "ADJUSTMENT",
        quantity: data.quantity,
        stockBefore: product.stock,
        stockAfter: newStock,
        note: data.note || "Ajuste manual de inventario",
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "ADJUST",
        entity: "INVENTORY",
        entityId: data.productId,
        detail: `Ajuste de inventario: ${data.quantity} (${product.stock} → ${newStock}) - ${data.note || "Sin observación"}`,
      },
    });

    return movement;
  });

  return movement;
};
