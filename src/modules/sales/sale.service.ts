import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateSaleInput } from "./sale.schema";
import { MovementType, Product } from "@prisma/client";

interface EnrichedDetail {
  productId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export const findAll = async () => {
  return prisma.sale.findMany({
    include: {
      client: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      details: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findById = async (id: number) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      details: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
      returns: {
        include: {
          details: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!sale) throw new AppError("Venta no encontrada", 404);
  return sale;
};

export const create = async (data: CreateSaleInput, userId: number, userRole: string) => {
  if (data.discount > 0 && userRole !== "ADMINISTRADOR") {
    const hasDiscountPermission = await prisma.rolePermission.findFirst({
      where: {
        role: { name: userRole },
        permission: { name: "sales:create" },
      },
    });
  }

  let totalDiscount = data.discount || 0;

  const enrichedDetails: EnrichedDetail[] = [];
  for (const detail of data.details) {
    const product = await prisma.product.findUnique({
      where: { id: detail.productId },
    });

    if (!product) throw new AppError(`Producto ID ${detail.productId} no encontrado`, 404);
    if (!product.active) throw new AppError(`Producto ${product.name} está inactivo`, 400);
    if (product.stock < detail.quantity) {
      throw new AppError(
        `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${detail.quantity}`,
        400
      );
    }

    const detailSubtotal = detail.quantity * product.salePrice;
    const detailDiscount = detail.discount || 0;

    enrichedDetails.push({
      productId: product.id,
      product,
      quantity: detail.quantity,
      unitPrice: product.salePrice,
      discount: detailDiscount,
      subtotal: detailSubtotal - detailDiscount,
    });
  }

  const subtotal = enrichedDetails.reduce((sum, d) => sum + d.product.salePrice * d.quantity, 0);

  const config = await prisma.storeConfig.findFirst();
  const taxPercentage = config?.taxPercentage || 15;
  const tax = ((subtotal - totalDiscount) * taxPercentage) / 100;
  const total = subtotal - totalDiscount + tax;

  const sale = await prisma.$transaction(async (tx) => {
    const lastSale = await tx.sale.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const saleNumber = (lastSale?.number || 0) + 1;

    const sale = await tx.sale.create({
      data: {
        series: "FV",
        number: saleNumber,
        clientId: data.clientId || 1,
        userId,
        subtotal,
        discount: totalDiscount,
        tax,
        total,
        paymentMethod: data.paymentMethod || "EFECTIVO",
        details: {
          create: enrichedDetails.map((d) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            discount: d.discount,
            subtotal: d.subtotal,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        details: {
          include: { product: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    for (const detail of enrichedDetails) {
      const product = detail.product;

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: detail.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          userId,
          type: "SALE_OUT" as MovementType,
          quantity: detail.quantity,
          stockBefore: product.stock,
          stockAfter: product.stock - detail.quantity,
          reference: "SALE",
          referenceId: sale.id,
        },
      });
    }

    const openRegister = await tx.cashRegister.findFirst({
      where: { userId, status: "ABIERTA" },
    });

    if (openRegister) {
      await tx.cashMovement.create({
        data: {
          cashRegisterId: openRegister.id,
          type: "SALE",
          amount: total,
          description: `Venta #${saleNumber}`,
        },
      });

      await tx.cashRegister.update({
        where: { id: openRegister.id },
        data: { totalSales: { increment: total } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entity: "SALE",
        entityId: sale.id,
        detail: `Venta #${saleNumber} creada por ${total}`,
      },
    });

    return sale;
  });

  return sale;
};

export const cancel = async (id: number, userId: number) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!sale) throw new AppError("Venta no encontrada", 404);
  if (sale.status === "ANULADA") throw new AppError("La venta ya está anulada", 400);

  const cancelledSale = await prisma.$transaction(async (tx) => {
    const updated = await tx.sale.update({
      where: { id },
      data: { status: "ANULADA" },
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        details: {
          include: { product: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    for (const detail of sale.details) {
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
          type: "ADJUSTMENT",
          quantity: detail.quantity,
          stockBefore: product!.stock,
          stockAfter: product!.stock + detail.quantity,
          reference: "CANCELLED_SALE",
          referenceId: sale.id,
          note: "Anulación de venta - reversión de stock",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: "CANCEL",
        entity: "SALE",
        entityId: sale.id,
        detail: `Venta #${sale.number} anulada`,
      },
    });

    return updated;
  });

  return cancelledSale;
};
