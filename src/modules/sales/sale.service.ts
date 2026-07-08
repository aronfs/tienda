import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import { CreateSaleInput } from "./sale.schema";
import { calculateLineTotal, calculateSaleTotals } from "../taxes/taxCalculator.service";

export const findAll = async (companyId: number) => {
  return prisma.sale.findMany({
    where: { companyId },
    include: {
      client: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      details: {
        include: { product: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findById = async (id: number, companyId: number) => {
  const sale = await prisma.sale.findFirst({
    where: { id, companyId },
    include: {
      client: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) throw new AppError("Debe configurar la empresa antes de usar este módulo", 400);

  const companyId = user.companyId;
  const branchId = data.branchId || user.branchId;
  if (!branchId) throw new AppError("Debe estar asociado a una sucursal para realizar ventas", 400);

  const billingConfig = await prisma.billingConfig.findUnique({ where: { companyId } });
  const includeTax = billingConfig?.includeTaxInPrice || false;

  let invoiceNumber: string | undefined;
  let invoicePrefix: string | undefined;
  let invoiceResolutionId: number | undefined;

  if (billingConfig?.autoGenerateInvoiceNumber) {
    const resolution = await prisma.invoiceResolution.findFirst({
      where: { companyId, status: "ACTIVE", branchId },
      orderBy: { currentNumber: "desc" },
    });

    if (resolution) {
      if (resolution.currentNumber >= resolution.endNumber) {
        await prisma.invoiceResolution.update({ where: { id: resolution.id }, data: { status: "EXHAUSTED" } });
        if (!billingConfig.allowInvoiceWithoutResolution) {
          throw new AppError("Resolución fiscal agotada. Registre una nueva resolución.", 400);
        }
      } else if (new Date(resolution.validUntil) < new Date()) {
        await prisma.invoiceResolution.update({ where: { id: resolution.id }, data: { status: "EXPIRED" } });
        if (!billingConfig.allowInvoiceWithoutResolution) {
          throw new AppError("Resolución fiscal vencida. Registre una nueva resolución.", 400);
        }
      } else {
        invoicePrefix = resolution.prefix;
        invoiceResolutionId = resolution.id;
        invoiceNumber = `${resolution.prefix}-${String(resolution.currentNumber + 1).padStart(8, "0")}`;
      }
    } else if (!billingConfig.allowInvoiceWithoutResolution) {
      throw new AppError("No hay una resolución fiscal activa. Configure una resolución en Facturación.", 400);
    }
  }

  let totalDiscount = data.discount || 0;

  const enrichedDetails: {
    productId: number;
    product: any;
    quantity: number;
    unitPrice: number;
    discount: number;
    lineSubtotal: number;
    taxRate: number;
    taxAmount: number;
    totalLine: number;
    taxId: number | null;
  }[] = [];

  for (const detail of data.details) {
    const product = await prisma.product.findUnique({
      where: { id: detail.productId },
      include: { tax: true },
    });

    if (!product) throw new AppError(`Producto ID ${detail.productId} no encontrado`, 404);
    if (!product.active) throw new AppError(`Producto ${product.name} está inactivo`, 400);
    if (product.stock < detail.quantity) {
      throw new AppError(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${detail.quantity}`, 400);
    }

    let taxRate = 0;
    let taxId: number | null = null;

    if (product.taxId && product.tax) {
      taxRate = product.tax.rate;
      taxId = product.tax.id;
    } else {
      const defaultTax = await prisma.tax.findFirst({ where: { companyId, isDefault: true, isActive: true } });
      if (defaultTax) {
        taxRate = defaultTax.rate;
        taxId = defaultTax.id;
      }
    }

    const lineResult = calculateLineTotal(detail.quantity, product.salePrice, taxRate, includeTax);
    const detailDiscount = detail.discount || 0;

    enrichedDetails.push({
      productId: product.id,
      product,
      quantity: detail.quantity,
      unitPrice: product.salePrice,
      discount: detailDiscount,
      lineSubtotal: lineResult.lineSubtotal - detailDiscount,
      taxRate: lineResult.taxRate,
      taxAmount: lineResult.taxAmount,
      totalLine: lineResult.totalLine - detailDiscount,
      taxId,
    });
  }

  const rawSubtotal = enrichedDetails.reduce((sum, d) => sum + d.product.salePrice * d.quantity, 0);
  const totals = calculateSaleTotals(
    enrichedDetails.map((d) => ({ quantity: d.quantity, unitPrice: d.unitPrice, taxRate: d.taxRate })),
    includeTax,
    totalDiscount
  );

  const sale = await prisma.$transaction(async (tx) => {
    const lastSale = await tx.sale.findFirst({
      where: { companyId },
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
        companyId,
        branchId,
        subtotal: totals.subtotal,
        discount: totalDiscount,
        tax: totals.taxTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        paymentMethod: data.paymentMethod || "EFECTIVO",
        invoiceNumber,
        invoicePrefix,
        invoiceResolutionId,
        details: {
          create: enrichedDetails.map((d) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            discount: d.discount,
            subtotal: d.lineSubtotal,
            taxId: d.taxId,
            taxRate: d.taxRate,
            taxAmount: d.taxAmount,
            totalLine: d.totalLine,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
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
          type: "SALE_OUT",
          quantity: detail.quantity,
          stockBefore: product.stock,
          stockAfter: product.stock - detail.quantity,
          reference: "SALE",
          referenceId: sale.id,
          companyId,
          branchId,
        },
      });
    }

    if (invoiceResolutionId) {
      await tx.invoiceResolution.update({
        where: { id: invoiceResolutionId },
        data: { currentNumber: { increment: 1 } },
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
          amount: sale.total,
          description: `Venta #${saleNumber}`,
        },
      });

      await tx.cashRegister.update({
        where: { id: openRegister.id },
        data: { totalSales: { increment: sale.total } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entity: "SALE",
        entityId: sale.id,
        detail: `Venta #${saleNumber} creada por ${sale.total} - ${invoiceNumber || "sin factura"}`,
      },
    });

    return sale;
  });

  return sale;
};

export const cancel = async (id: number, userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) throw new AppError("Sin empresa asignada", 400);

  const sale = await prisma.sale.findFirst({
    where: { id, companyId: user.companyId },
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
          companyId: user.companyId,
          branchId: user.branchId,
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