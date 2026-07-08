import prisma from "../../config/prisma";

export const getSummary = async (companyId: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    ventasDelDia,
    ventasDelMes,
    totalProductos,
    productosBajoStock,
    totalClientes,
    ultimasVentas,
    productosMasVendidos,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: "COMPLETADA",
        companyId,
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: "COMPLETADA",
        companyId,
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.product.count({ where: { active: true, companyId } }),
    prisma.product.count({
      where: {
        active: true,
        companyId,
        stock: { lte: prisma.product.fields.minStock },
      },
    }),
    prisma.client.count({ where: { active: true, companyId } }),
    prisma.sale.findMany({
      where: { status: "COMPLETADA", companyId },
      include: {
        client: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.saleDetail.groupBy({
      by: ["productId"],
      where: {
        sale: { companyId, status: "COMPLETADA" },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
  ]);

  const topProductIds = productosMasVendidos.map((p) => p.productId);
  const topProducts = topProductIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds }, companyId },
        select: { id: true, name: true, code: true },
      })
    : [];

  const productosMasVendidosDetalle = productosMasVendidos.map((p) => {
    const product = topProducts.find((tp) => tp.id === p.productId);
    return {
      productId: p.productId,
      productName: product?.name || "Desconocido",
      productCode: product?.code || "",
      totalVendido: p._sum.quantity || 0,
    };
  });

  return {
    ventasDelDia: {
      total: ventasDelDia._sum.total || 0,
      cantidad: ventasDelDia._count,
    },
    ventasDelMes: {
      total: ventasDelMes._sum.total || 0,
      cantidad: ventasDelMes._count,
    },
    totalProductos,
    productosBajoStock,
    totalClientes,
    ultimasVentas: ultimasVentas.map((v) => ({
      id: v.id,
      number: v.number,
      total: v.total,
      cliente: v.client.name,
      usuario: v.user.name,
      createdAt: v.createdAt,
    })),
    productosMasVendidos: productosMasVendidosDetalle,
  };
};
