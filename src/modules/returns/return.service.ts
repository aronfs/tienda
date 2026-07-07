import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateReturnInput } from "./return.schema";
import { Product } from "@prisma/client";

interface EnrichedReturnDetail {
  productId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export const findAll = async () => {
  return prisma.return.findMany({
    include: {
      sale: { select: { id: true, number: true, series: true } },
      details: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const create = async (data: CreateReturnInput, userId: number) => {
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { details: true },
  });

  if (!sale) throw new AppError("Venta no encontrada", 404);
  if (sale.status === "ANULADA") throw new AppError("No se puede devolver una venta anulada", 400);

  const enrichedDetails: EnrichedReturnDetail[] = [];
  for (const detail of data.details) {
    const saleDetail = sale.details.find((sd) => sd.productId === detail.productId);
    if (!saleDetail) {
      throw new AppError(`Producto ID ${detail.productId} no está en la venta`, 400);
    }

    const product = await prisma.product.findUnique({
      where: { id: detail.productId },
    });
    if (!product) throw new AppError(`Producto ID ${detail.productId} no encontrado`, 404);

    enrichedDetails.push({
      productId: detail.productId,
      product,
      quantity: detail.quantity,
      unitPrice: saleDetail.unitPrice,
      subtotal: detail.quantity * saleDetail.unitPrice,
    });
  }

  const subtotal = enrichedDetails.reduce((sum, d) => sum + d.subtotal, 0);
  const total = subtotal;

  const returnRecord = await prisma.$transaction(async (tx) => {
    const returnRecord = await tx.return.create({
      data: {
        saleId: data.saleId,
        userId,
        reason: data.reason,
        subtotal,
        tax: 0,
        total,
        details: {
          create: enrichedDetails.map((d) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            subtotal: d.subtotal,
          })),
        },
      },
      include: {
        sale: { select: { id: true, number: true } },
        details: {
          include: { product: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    for (const detail of enrichedDetails) {
      const product = detail.product;

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: detail.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          userId,
          type: "RETURN_IN",
          quantity: detail.quantity,
          stockBefore: product.stock,
          stockAfter: product.stock + detail.quantity,
          reference: "RETURN",
          referenceId: returnRecord.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entity: "RETURN",
        entityId: returnRecord.id,
        detail: `Devolución #${returnRecord.id} por ${total} de venta #${sale.number}`,
      },
    });

    return returnRecord;
  });

  return returnRecord;
};
