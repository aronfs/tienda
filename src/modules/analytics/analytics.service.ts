import prisma from "../../config/prisma";
import { getPeriodDateRange, getPreviousPeriod, CHART_COLORS } from "./analytics.constants";
import type {
  DashboardSummary,
  SalesAnalytics,
  RevenueAnalytics,
  PurchaseAnalytics,
  ProductAnalytics,
  CategoryAnalytics,
  ClientAnalytics,
  ProviderAnalytics,
  InventoryAnalytics,
  CashAnalytics,
  Report,
  GenerateReportInput,
  ChartData,
  Alert,
  Indicator,
} from "./analytics.types";
import { calculateMargin, calculateVariation, calculateRotation, getMonthName, getTrend } from "./analytics.mapper";
import type { PeriodFilterInput } from "./analytics.schema";

async function getDateRange(filter: PeriodFilterInput) {
  return getPeriodDateRange(filter.period || "this_month", filter.startDate, filter.endDate);
}

export async function getDashboard(filter: PeriodFilterInput, companyId: number): Promise<DashboardSummary> {
  const todayRange = getPeriodDateRange("today");
  const monthRange = getPeriodDateRange("this_month");
  const yearRange = getPeriodDateRange("year");

  const range = await getDateRange(filter);
  const prevRange = getPreviousPeriod(range);

  const [
    salesToday,
    salesMonth,
    salesYear,
    allSalesRange,
    allSalesPrev,
    clientsNew,
    clientsActive,
    productAgg,
    categoryCount,
    providerCount,
    purchasesMonth,
    purchasesYear,
    cashRegister,
    lastSales,
    lastPurchases,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { companyId, createdAt: { gte: todayRange.startDate, lte: todayRange.endDate }, status: "COMPLETADA" },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { companyId, createdAt: { gte: monthRange.startDate, lte: monthRange.endDate }, status: "COMPLETADA" },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: { companyId, createdAt: { gte: yearRange.startDate, lte: yearRange.endDate }, status: "COMPLETADA" },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.sale.findMany({
      where: { companyId, status: "COMPLETADA", createdAt: { gte: range.startDate, lte: range.endDate } },
      include: { details: true },
    }),
    prisma.sale.findMany({
      where: { companyId, status: "COMPLETADA", createdAt: { gte: prevRange.startDate, lte: prevRange.endDate } },
      include: { details: true },
    }),
    prisma.client.count({ where: { companyId, createdAt: { gte: monthRange.startDate, lte: monthRange.endDate } } }),
    prisma.client.count({ where: { companyId, active: true } }),
    prisma.product.aggregate({ where: { companyId }, _count: { id: true } }),
    prisma.category.count({ where: { companyId } }),
    prisma.provider.count({ where: { companyId, active: true } }),
    prisma.purchase.aggregate({
      where: { companyId, createdAt: { gte: monthRange.startDate, lte: monthRange.endDate }, status: "COMPLETADA" },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.purchase.aggregate({
      where: { companyId, createdAt: { gte: yearRange.startDate, lte: yearRange.endDate }, status: "COMPLETADA" },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.cashRegister.findFirst({
      where: { companyId, status: "ABIERTA" },
      orderBy: { openingDate: "desc" },
    }),
    prisma.sale.findMany({
      where: { companyId, status: "COMPLETADA" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.purchase.findMany({
      where: { companyId, status: "COMPLETADA" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { provider: { select: { name: true } } },
    }),
  ]);

  const revenue = allSalesRange.reduce((sum, s) => sum + s.total, 0);
  const cost = allSalesRange.reduce(
    (sum, s) => sum + s.details.reduce((dSum, d) => dSum + d.unitPrice * d.quantity, 0),
    0
  );
  const prevRevenue = allSalesPrev.reduce((sum, s) => sum + s.total, 0);
  const prevCost = allSalesPrev.reduce(
    (sum, s) => sum + s.details.reduce((dSum, d) => dSum + d.unitPrice * d.quantity, 0),
    0
  );
  const profit = revenue - cost;
  const prevProfit = prevRevenue - prevCost;
  const margin = calculateMargin(revenue, cost);

  const [activeProducts, outOfStockCount, allActiveProducts] = await Promise.all([
    prisma.product.count({ where: { companyId, active: true } }),
    prisma.product.count({ where: { companyId, stock: 0, active: true } }),
    prisma.product.findMany({ where: { companyId, active: true }, select: { stock: true, minStock: true } }),
  ]);
  const lowStockCount = allActiveProducts.filter((p) => p.minStock > 0 && p.stock > 0 && p.stock <= p.minStock).length;

  const alerts: Alert[] = [];
  if (outOfStockCount > 0) alerts.push({ type: "critical" as const, message: "Productos agotados", count: outOfStockCount });
  if (lowStockCount > 0) alerts.push({ type: "warning" as const, message: "Productos con stock bajo", count: lowStockCount });
  if (cashRegister && Math.abs(cashRegister.difference || 0) > 0)
    alerts.push({ type: "warning" as const, message: "Diferencia en caja", count: 1 });

  const indicators: Indicator[] = [
    {
      label: "Ingresos",
      value: revenue,
      previous: prevRevenue,
      variation: calculateVariation(revenue, prevRevenue),
      trend: getTrend(revenue, prevRevenue),
      format: "currency",
    },
    {
      label: "Ganancias",
      value: profit,
      previous: prevProfit,
      variation: calculateVariation(profit, prevProfit),
      trend: getTrend(profit, prevProfit),
      format: "currency",
    },
    {
      label: "Margen",
      value: margin,
      previous: calculateMargin(prevRevenue, prevCost),
      variation: calculateVariation(margin, calculateMargin(prevRevenue, prevCost)),
      trend: getTrend(margin, calculateMargin(prevRevenue, prevCost)),
      format: "percentage",
    },
  ];

  return {
    salesToday: { count: salesToday._count.id || 0, total: salesToday._sum.total || 0 },
    salesMonth: { count: salesMonth._count.id || 0, total: salesMonth._sum.total || 0 },
    salesYear: { count: salesYear._count.id || 0, total: salesYear._sum.total || 0 },
    revenue: { total: revenue, cost, profit, margin },
    clients: { new: clientsNew, active: clientsActive },
    products: {
      total: productAgg._count.id,
      active: activeProducts,
      outOfStock: outOfStockCount,
      lowStock: lowStockCount,
    },
    categories: { total: categoryCount },
    providers: { total: providerCount },
    purchasesMonth: {
      count: purchasesMonth._count.id || 0,
      total: purchasesMonth._sum.total || 0,
    },
    purchasesYear: {
      count: purchasesYear._count.id || 0,
      total: purchasesYear._sum.total || 0,
    },
    cashRegister: {
      open: cashRegister?.status === "ABIERTA",
      balance: cashRegister ? (cashRegister.expectedTotal || 0) - (cashRegister.totalExpenses || 0) : 0,
    },
    lastSales: lastSales.map((s) => ({
      id: s.id,
      client: s.client.name,
      user: s.user.name,
      total: s.total,
      date: s.createdAt,
    })),
    lastPurchases: lastPurchases.map((p) => ({
      id: p.id,
      provider: p.provider.name,
      total: p.total,
      date: p.createdAt,
    })),
    alerts,
    indicators,
  };
}

export async function getSalesAnalytics(filter: PeriodFilterInput, companyId: number): Promise<SalesAnalytics> {
  const range = await getDateRange(filter);
  const prevRange = getPreviousPeriod(range);

  const where: any = {
    companyId,
    createdAt: { gte: range.startDate, lte: range.endDate },
  };
  if (filter.paymentMethod) where.paymentMethod = filter.paymentMethod;
  if (filter.userId) where.userId = filter.userId;
  if (filter.clientId) where.clientId = filter.clientId;

  const prevWhere: any = {
    companyId,
    createdAt: { gte: prevRange.startDate, lte: prevRange.endDate },
  };
  if (filter.paymentMethod) prevWhere.paymentMethod = filter.paymentMethod;

  const [sales, prevSales] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { details: { include: { product: true } }, user: true, client: true },
    }),
    prisma.sale.findMany({
      where: prevWhere,
      include: { details: true },
    }),
  ]);

  const completed = sales.filter((s) => s.status === "COMPLETADA");
  const cancelled = sales.filter((s) => s.status === "ANULADA");
  const totals = completed.map((s) => s.total);
  const prevCompleted = prevSales.filter((s) => s.status === "COMPLETADA");
  const prevTotals = prevCompleted.map((s) => s.total);
  const currentTotal = totals.reduce((a, b) => a + b, 0);
  const previousTotal = prevTotals.reduce((a, b) => a + b, 0);

  const byPaymentMethod = Object.entries(
    completed.reduce(
      (acc, s) => {
        const key = s.paymentMethod;
        if (!acc[key]) acc[key] = { total: 0, count: 0 };
        acc[key].total += s.total;
        acc[key].count++;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>
    )
  ).map(([method, data]) => ({ method, ...data }));

  const byUser = Object.entries(
    completed.reduce(
      (acc, s) => {
        const key = s.userId;
        if (!acc[key])
          acc[key] = { userId: key, userName: s.user.name, total: 0, count: 0 };
        acc[key].total += s.total;
        acc[key].count++;
        return acc;
      },
      {} as Record<number, { userId: number; userName: string; total: number; count: number }>
    )
  ).map(([_, data]) => data);

  const byHour = Object.entries(
    completed.reduce(
      (acc, s) => {
        const hour = s.createdAt.getHours();
        if (!acc[hour]) acc[hour] = { hour, count: 0, total: 0 };
        acc[hour].count++;
        acc[hour].total += s.total;
        return acc;
      },
      {} as Record<number, { hour: number; count: number; total: number }>
    )
  ).map(([_, data]) => data);

  const byDay = Object.entries(
    completed.reduce(
      (acc, s) => {
        const date = s.createdAt.toISOString().split("T")[0];
        if (!acc[date]) acc[date] = { date, count: 0, total: 0 };
        acc[date].count++;
        acc[date].total += s.total;
        return acc;
      },
      {} as Record<string, { date: string; count: number; total: number }>
    )
  ).map(([_, data]) => data);

  const byWeek = Object.entries(
    completed.reduce(
      (acc, s) => {
        const d = new Date(s.createdAt);
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(
          ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
        );
        if (!acc[week]) acc[week] = { week, count: 0, total: 0 };
        acc[week].count++;
        acc[week].total += s.total;
        return acc;
      },
      {} as Record<number, { week: number; count: number; total: number }>
    )
  ).map(([_, data]) => data);

  const byMonth = Object.entries(
    completed.reduce(
      (acc, s) => {
        const month = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
        if (!acc[month]) acc[month] = { month, count: 0, total: 0 };
        acc[month].count++;
        acc[month].total += s.total;
        return acc;
      },
      {} as Record<string, { month: string; count: number; total: number }>
    )
  ).map(([_, data]) => data);

  return {
    totalSales: currentTotal,
    countSales: completed.length,
    averageTicket: completed.length > 0 ? currentTotal / completed.length : 0,
    maxSale: totals.length > 0 ? Math.max(...totals) : 0,
    minSale: totals.length > 0 ? Math.min(...totals) : 0,
    cancelledSales: cancelled.length,
    byPaymentMethod,
    byUser,
    byHour,
    byDay,
    byWeek,
    byMonth,
    comparison: {
      previous: { count: prevCompleted.length, total: previousTotal },
      current: { count: completed.length, total: currentTotal },
      variation: {
        count: calculateVariation(completed.length, prevCompleted.length),
        total: calculateVariation(currentTotal, previousTotal),
      },
    },
  };
}

export async function getRevenueAnalytics(filter: PeriodFilterInput, companyId: number): Promise<RevenueAnalytics> {
  const range = await getDateRange(filter);
  const prevRange = getPreviousPeriod(range);

  const [sales, prevSales, yearlySales] = await Promise.all([
    prisma.sale.findMany({
      where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
      include: { details: true },
    }),
    prisma.sale.findMany({
      where: { companyId, createdAt: { gte: prevRange.startDate, lte: prevRange.endDate }, status: "COMPLETADA" },
      include: { details: true },
    }),
    prisma.sale.findMany({
      where: { companyId, status: "COMPLETADA" },
      include: { details: true },
    }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cost = sales.reduce((sum, s) => sum + s.details.reduce((dSum, d) => dSum + d.unitPrice * d.quantity, 0), 0);
  const profit = revenue - cost;
  const prevRevenue = prevSales.reduce((sum, s) => sum + s.total, 0);
  const prevCost = prevSales.reduce((sum, s) => sum + s.details.reduce((dSum, d) => dSum + d.unitPrice * d.quantity, 0), 0);
  const prevProfit = prevRevenue - prevCost;

  const monthlyMap = new Map<string, { revenue: number; cost: number }>();
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { revenue: 0, cost: 0 });
  }
  yearlySales.forEach((s) => {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap.has(key)) {
      const existing = monthlyMap.get(key)!;
      existing.revenue += s.total;
      existing.cost += s.details.reduce((sum, d) => sum + d.unitPrice * d.quantity, 0);
    }
  });

  const monthlyRevenue = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
    }));

  const yearlyMap = new Map<number, { revenue: number; cost: number }>();
  yearlySales.forEach((s) => {
    const year = s.createdAt.getFullYear();
    if (!yearlyMap.has(year)) yearlyMap.set(year, { revenue: 0, cost: 0 });
    const y = yearlyMap.get(year)!;
    y.revenue += s.total;
    y.cost += s.details.reduce((sum, d) => sum + d.unitPrice * d.quantity, 0);
  });

  const yearlyRevenue = Array.from(yearlyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, data]) => ({
      year,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
    }));

  return {
    revenue,
    cost,
    profit,
    grossMargin: calculateMargin(revenue, cost),
    netMargin: revenue > 0 ? calculateMargin(profit, revenue) : 0,
    averageOrderValue: sales.length > 0 ? revenue / sales.length : 0,
    revenueGrowth: calculateVariation(revenue, prevRevenue),
    profitGrowth: calculateVariation(profit, prevProfit),
    monthlyRevenue,
    yearlyRevenue,
  };
}

export async function getPurchaseAnalytics(filter: PeriodFilterInput, companyId: number): Promise<PurchaseAnalytics> {
  const range = await getDateRange(filter);
  const prevRange = getPreviousPeriod(range);

  const [purchases, prevPurchases] = await Promise.all([
    prisma.purchase.findMany({
      where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
      include: { provider: true, details: { include: { product: true } } },
    }),
    prisma.purchase.findMany({
      where: { companyId, createdAt: { gte: prevRange.startDate, lte: prevRange.endDate }, status: "COMPLETADA" },
    }),
  ]);

  const todayRange = getPeriodDateRange("today");
  const monthRange = getPeriodDateRange("this_month");

  const todayPurchases = purchases.filter(
    (p) => p.createdAt >= todayRange.startDate && p.createdAt <= todayRange.endDate
  );
  const monthPurchases = purchases.filter(
    (p) => p.createdAt >= monthRange.startDate && p.createdAt <= monthRange.endDate
  );

  const byProvider = Object.entries(
    purchases.reduce(
      (acc, p) => {
        const key = p.providerId;
        if (!acc[key])
          acc[key] = { providerId: key, providerName: p.provider.name, count: 0, total: 0 };
        acc[key].count++;
        acc[key].total += p.total;
        return acc;
      },
      {} as Record<number, { providerId: number; providerName: string; count: number; total: number }>
    )
  ).map(([_, data]) => data);

  const mainProvider =
    byProvider.length > 0 ? byProvider.sort((a, b) => b.total - a.total)[0] : null;

  const totalCost = purchases.reduce((sum, p) => sum + p.total, 0);
  const prevTotal = prevPurchases.reduce((sum, p) => sum + p.total, 0);
  const productsPurchased = purchases.reduce((sum, p) => sum + p.details.reduce((ds, d) => ds + d.quantity, 0), 0);

  return {
    today: { count: todayPurchases.length, total: todayPurchases.reduce((s, p) => s + p.total, 0) },
    month: { count: monthPurchases.length, total: monthPurchases.reduce((s, p) => s + p.total, 0) },
    byProvider,
    averageCost: purchases.length > 0 ? totalCost / purchases.length : 0,
    mainProvider: mainProvider
      ? { id: mainProvider.providerId, name: mainProvider.providerName, total: mainProvider.total }
      : null,
    productsPurchased,
    amountInvested: totalCost,
    variation: {
      previous: prevTotal,
      current: totalCost,
      percentage: calculateVariation(totalCost, prevTotal),
    },
  };
}

export async function getProductAnalytics(filter: PeriodFilterInput, companyId: number): Promise<ProductAnalytics> {
  const range = await getDateRange(filter);

  const [products, saleDetails] = await Promise.all([
    prisma.product.findMany({ where: { companyId, active: true } }),
    prisma.saleDetail.findMany({
      where: {
        companyId,
        sale: { createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
      },
      include: { product: true },
    }),
  ]);

  const productSalesMap = new Map<
    number,
    { productId: number; productName: string; code: string; quantity: number; total: number }
  >();

  saleDetails.forEach((d) => {
    if (!productSalesMap.has(d.productId)) {
      productSalesMap.set(d.productId, {
        productId: d.productId,
        productName: d.product.name,
        code: d.product.code,
        quantity: 0,
        total: 0,
      });
    }
    const entry = productSalesMap.get(d.productId)!;
    entry.quantity += d.quantity;
    entry.total += d.subtotal;
  });

  const productSalesArr = Array.from(productSalesMap.values());
  const bestSellers = [...productSalesArr].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const worstSellers = [...productSalesArr].sort((a, b) => a.quantity - b.quantity).slice(0, 10);

  const productProfits = productSalesArr
    .map((ps) => {
      const p = products.find((pr) => pr.id === ps.productId);
      const cost = p ? p.purchasePrice * ps.quantity : 0;
      const profit = ps.total - cost;
      const margin = p ? calculateMargin(ps.total, cost) : 0;
      return { productId: ps.productId, productName: ps.productName, code: ps.code, profit, margin };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const highestMargin = [...productSalesArr]
    .map((ps) => {
      const p = products.find((pr) => pr.id === ps.productId);
      const cost = p ? p.purchasePrice * ps.quantity : 0;
      return {
        productId: ps.productId,
        productName: ps.productName,
        code: ps.code,
        margin: calculateMargin(ps.total, cost),
      };
    })
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10);

  const highestRotation = products
    .map((p) => {
      const sold = productSalesArr.find((ps) => ps.productId === p.id);
      return {
        productId: p.id,
        productName: p.name,
        code: p.code,
        rotation: calculateRotation(sold?.quantity || 0, p.stock),
      };
    })
    .filter((r) => r.rotation > 0)
    .sort((a, b) => b.rotation - a.rotation)
    .slice(0, 10);

  const soldProductIds = new Set(productSalesArr.map((ps) => ps.productId));
  const noMovement = products
    .filter((p) => !soldProductIds.has(p.id))
    .map((p) => ({ productId: p.id, productName: p.name, code: p.code, stock: p.stock }));

  const criticalStock = products
    .filter((p) => p.stock > 0 && p.stock <= p.minStock * 0.5)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      code: p.code,
      stock: p.stock,
      minStock: p.minStock,
    }));

  const lowStock = products
    .filter((p) => p.stock > 0 && p.stock <= p.minStock && p.stock > p.minStock * 0.5)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      code: p.code,
      stock: p.stock,
      minStock: p.minStock,
    }));

  const outOfStock = products
    .filter((p) => p.stock === 0)
    .map((p) => ({ productId: p.id, productName: p.name, code: p.code }));

  const inventoryValue = products.reduce(
    (acc, p) => ({
      cost: acc.cost + p.purchasePrice * p.stock,
      sale: acc.sale + p.salePrice * p.stock,
      potentialProfit: acc.potentialProfit + (p.salePrice - p.purchasePrice) * p.stock,
    }),
    { cost: 0, sale: 0, potentialProfit: 0 }
  );

  const immobilizedInventory = products
    .filter((p) => {
      const sold = productSalesArr.find((ps) => ps.productId === p.id);
      return !sold || sold.quantity === 0;
    })
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      code: p.code,
      stock: p.stock,
      value: p.purchasePrice * p.stock,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    bestSellers,
    worstSellers,
    highestProfit: productProfits,
    highestMargin,
    highestRotation,
    noMovement,
    criticalStock,
    lowStock,
    outOfStock,
    inventoryValue,
    immobilizedInventory,
  };
}

export async function getCategoryAnalytics(filter: PeriodFilterInput, companyId: number): Promise<CategoryAnalytics> {
  const range = await getDateRange(filter);

  const [categories, saleDetails] = await Promise.all([
    prisma.category.findMany({ where: { companyId, active: true }, include: { products: true } }),
    prisma.saleDetail.findMany({
      where: {
        companyId,
        sale: { createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
      },
      include: { product: true },
    }),
  ]);

  const totalSales = saleDetails.reduce((sum, d) => sum + d.subtotal, 0);

  const categoryData = categories.map((cat) => {
    const catDetails = saleDetails.filter((d) => d.product.categoryId === cat.id);
    const sales = catDetails.reduce((sum, d) => sum + d.subtotal, 0);
    const cost = catDetails.reduce((sum, d) => sum + d.product.purchasePrice * d.quantity, 0);
    const count = catDetails.length;
    const profit = sales - cost;
    const margin = calculateMargin(sales, cost);
    const productCount = cat.products.length;
    const soldProductIds = new Set(catDetails.map((d) => d.productId));
    const rotation = productCount > 0 ? soldProductIds.size / productCount : 0;
    const percentage = totalSales > 0 ? (sales / totalSales) * 100 : 0;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      sales,
      count,
      profit,
      margin,
      productCount,
      rotation,
      percentage,
    };
  });

  const participation = categoryData
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      percentage: c.percentage,
      sales: c.sales,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const sales = categoryData
    .map((c) => ({ categoryId: c.categoryId, categoryName: c.categoryName, total: c.sales, count: c.count }))
    .sort((a, b) => b.total - a.total);

  const profits = categoryData
    .map((c) => ({ categoryId: c.categoryId, categoryName: c.categoryName, profit: c.profit, margin: c.margin }))
    .sort((a, b) => b.profit - a.profit);

  const products = categoryData.map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    productCount: c.productCount,
  }));

  const rotation = categoryData
    .map((c) => ({ categoryId: c.categoryId, categoryName: c.categoryName, rotation: c.rotation }))
    .sort((a, b) => b.rotation - a.rotation);

  const topCategories = categoryData
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      sales: c.sales,
      profit: c.profit,
      percentage: c.percentage,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  return { participation, sales, profits, products, rotation, topCategories };
}

export async function getClientAnalytics(filter: PeriodFilterInput, companyId: number): Promise<ClientAnalytics> {
  const range = await getDateRange(filter);

  const [clients, sales] = await Promise.all([
    prisma.client.findMany({ where: { companyId, active: true } }),
    prisma.sale.findMany({
      where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
      include: { client: true },
    }),
  ]);

  const newClients = clients.filter(
    (c) => c.createdAt >= range.startDate && c.createdAt <= range.endDate
  ).length;

  const clientSalesMap = new Map<number, { clientId: number; clientName: string; total: number; count: number }>();
  sales.forEach((s) => {
    if (!clientSalesMap.has(s.clientId)) {
      clientSalesMap.set(s.clientId, {
        clientId: s.clientId,
        clientName: s.client.name,
        total: 0,
        count: 0,
      });
    }
    const entry = clientSalesMap.get(s.clientId)!;
    entry.total += s.total;
    entry.count++;
  });

  const clientSalesArr = Array.from(clientSalesMap.values());
  const activeIds = new Set(clientSalesArr.map((c) => c.clientId));
  const inactiveClients = clients.filter((c) => !activeIds.has(c.id)).length;
  const frequentClients = clientSalesArr.filter((c) => c.count >= 3).length;
  const totalValue = clientSalesArr.reduce((sum, c) => sum + c.total, 0);
  const totalPurchases = clientSalesArr.reduce((sum, c) => sum + c.count, 0);

  return {
    newClients,
    frequentClients,
    inactiveClients,
    topBuyers: clientSalesArr.sort((a, b) => b.total - a.total).slice(0, 10),
    averagePurchase: totalPurchases > 0 ? totalValue / totalPurchases : 0,
    totalPurchases,
    accumulatedValue: totalValue,
  };
}

export async function getProviderAnalytics(filter: PeriodFilterInput, companyId: number): Promise<ProviderAnalytics> {
  const range = await getDateRange(filter);

  const [providers, purchases] = await Promise.all([
    prisma.provider.findMany({ where: { companyId, active: true } }),
    prisma.purchase.findMany({
      where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
      include: { provider: true, details: true },
    }),
  ]);

  const totalSpent = purchases.reduce((sum, p) => sum + p.total, 0);

  const byProvider = Object.entries(
    purchases.reduce(
      (acc, p) => {
        const key = p.providerId;
        if (!acc[key])
          acc[key] = { providerId: key, providerName: p.provider.name, total: 0, count: 0 };
        acc[key].total += p.total;
        acc[key].count++;
        return acc;
      },
      {} as Record<number, { providerId: number; providerName: string; total: number; count: number }>
    )
  ).map(([_, data]) => data);

  const productsSet = new Set(purchases.flatMap((p) => p.details.map((d) => d.productId)));

  const participation = providers
    .map((prov) => {
      const provTotal = byProvider.find((bp) => bp.providerId === prov.id)?.total || 0;
      return {
        providerId: prov.id,
        providerName: prov.name,
        percentage: totalSpent > 0 ? (provTotal / totalSpent) * 100 : 0,
      };
    })
    .filter((p) => p.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage);

  return {
    topProviders: byProvider.sort((a, b) => b.total - a.total).slice(0, 10),
    purchases: { count: purchases.length, total: totalSpent },
    amountInvested: totalSpent,
    products: { total: productsSet.size },
    averageDeliveryTime: 0,
    participation,
  };
}

export async function getInventoryAnalytics(filter: PeriodFilterInput, companyId: number): Promise<InventoryAnalytics> {
  const range = await getDateRange(filter);

  const [products, movements] = await Promise.all([
    prisma.product.findMany({ where: { companyId, active: true } }),
    prisma.inventoryMovement.findMany({
      where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const inventoryValue = products.reduce(
    (acc, p) => ({
      cost: acc.cost + p.purchasePrice * p.stock,
      sale: acc.sale + p.salePrice * p.stock,
    }),
    { cost: 0, sale: 0 }
  );

  const lowStockList = products
    .filter((p) => p.stock > 0 && p.stock <= p.minStock && p.stock > p.minStock * 0.5)
    .map((p) => ({ productId: p.id, productName: p.name, code: p.code, stock: p.stock, minStock: p.minStock }));

  const criticalStockList = products
    .filter((p) => p.stock > 0 && p.stock <= p.minStock * 0.5)
    .map((p) => ({ productId: p.id, productName: p.name, code: p.code, stock: p.stock, minStock: p.minStock }));

  const saleMovements = movements.filter((m) => m.type === "SALE_OUT");
  const purchaseMovements = movements.filter((m) => m.type === "PURCHASE_IN");
  const adjustmentMovements = movements.filter((m) => m.type === "ADJUSTMENT");

  const entries = purchaseMovements.reduce((sum, m) => sum + m.quantity, 0);
  const exits = saleMovements.reduce((sum, m) => sum + m.quantity, 0);
  const adjusts = adjustmentMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  const saleGroupBy = await prisma.saleDetail.groupBy({
    by: ["productId"],
    where: {
      companyId,
      sale: { createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
    },
    _sum: { quantity: true },
  });

  const rotation = products
    .map((p) => {
      const sold = saleGroupBy.find((s) => s.productId === p.id);
      return {
        productId: p.id,
        productName: p.name,
        code: p.code,
        rotation: calculateRotation(sold?._sum.quantity || 0, p.stock),
      };
    })
    .filter((r) => r.rotation > 0)
    .sort((a, b) => b.rotation - a.rotation)
    .slice(0, 10);

  const kardexMap = new Map<
    number,
    { productId: number; productName: string; code: string; entries: number; exits: number; balance: number }
  >();

  movements.forEach((m) => {
    if (!kardexMap.has(m.productId)) {
      kardexMap.set(m.productId, {
        productId: m.productId,
        productName: m.product.name,
        code: m.product.code,
        entries: 0,
        exits: 0,
        balance: m.product.stock,
      });
    }
    const entry = kardexMap.get(m.productId)!;
    if (m.type === "PURCHASE_IN") entry.entries += m.quantity;
    if (m.type === "SALE_OUT") entry.exits += Math.abs(m.quantity);
    if (m.type === "ADJUSTMENT") {
      if (m.quantity > 0) entry.entries += m.quantity;
      else entry.exits += Math.abs(m.quantity);
    }
    entry.balance = m.product.stock;
  });

  const kardexSummary = Array.from(kardexMap.values()).slice(0, 20);

  return {
    totalStock,
    inventoryValue,
    lowStock: lowStockList.slice(0, 20),
    criticalStock: criticalStockList.slice(0, 20),
    expiredProducts: [],
    expiringProducts: [],
    rotation,
    entries: { count: purchaseMovements.length, quantity: entries },
    exits: { count: saleMovements.length, quantity: exits },
    adjustments: { count: adjustmentMovements.length, quantity: adjusts },
    kardexSummary,
  };
}

export async function getCashAnalytics(filter: PeriodFilterInput, companyId: number): Promise<CashAnalytics> {
  const range = await getDateRange(filter);

  const [openRegister, registers] = await Promise.all([
    prisma.cashRegister.findFirst({
      where: { companyId, status: "ABIERTA" },
      include: { user: { select: { id: true, name: true } }, movements: true },
      orderBy: { openingDate: "desc" },
    }),
    prisma.cashRegister.findMany({
      where: { companyId, openingDate: { gte: range.startDate, lte: range.endDate } },
      include: { movements: true },
      orderBy: { openingDate: "desc" },
    }),
  ]);

  const salesByMethod = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
    _sum: { total: true },
    _count: { id: true },
  });

  const totalIngresos = registers.reduce((sum, r) => sum + r.totalSales, 0);
  const totalEgresos = registers.reduce((sum, r) => sum + r.totalExpenses, 0);
  const totalExpected = registers.reduce((sum, r) => sum + (r.expectedTotal || 0), 0);
  const totalActual = registers.reduce((sum, r) => sum + (r.actualTotal || 0), 0);

  return {
    openRegister: openRegister
      ? {
          id: openRegister.id,
          userId: openRegister.userId,
          userName: openRegister.user.name,
          openingDate: openRegister.openingDate,
          initialAmount: openRegister.initialAmount,
        }
      : null,
    ingresos: totalIngresos,
    egresos: totalEgresos,
    saldo: totalIngresos - totalEgresos,
    salesByMethod: salesByMethod.map((s) => ({
      method: s.paymentMethod,
      total: s._sum.total || 0,
      count: s._count.id,
    })),
    differences: { expected: totalExpected, actual: totalActual, difference: totalExpected - totalActual },
    arqueos: registers.map((r) => ({
      id: r.id,
      date: r.openingDate,
      expected: r.expectedTotal || 0,
      actual: r.actualTotal || 0,
      difference: r.difference || 0,
      status: r.status,
    })),
  };
}

export async function listReports(filter: PeriodFilterInput, companyId: number): Promise<Report[]> {
  const where: any = { action: "REPORT_GENERATED", companyId };
  if (filter.userId) where.userId = filter.userId;
  if (filter.startDate && filter.endDate) {
    where.createdAt = { gte: new Date(filter.startDate), lte: new Date(filter.endDate) };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return logs.map((log) => {
    const detail = log.detail ? safeJsonParse(log.detail) : {};
    return {
      id: log.id,
      name: detail?.name || log.action,
      description: detail?.description || "",
      format: detail?.format || "PDF",
      type: detail?.reportType || "general",
      createdAt: log.createdAt,
      createdBy: log.user?.name || "Sistema",
      status: "completed",
      filters: detail?.filters,
    };
  });
}

function safeJsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

export async function generateReport(
  input: GenerateReportInput,
  userId: number,
  companyId: number
): Promise<Report> {
  const now = new Date();
  const reportId = now.getTime();

  await prisma.auditLog.create({
    data: {
      userId,
      companyId,
      action: "REPORT_GENERATED",
      entity: "Report",
      entityId: reportId,
      detail: JSON.stringify({
        name: input.type,
        description: `Reporte de ${input.type}`,
        format: input.format,
        reportType: input.type,
        filters: input.filters,
        startDate: input.startDate,
        endDate: input.endDate,
      }),
    },
  });

  return {
    id: reportId,
    name: input.type,
    description: `Reporte de ${input.type}`,
    format: input.format,
    type: input.type,
    createdAt: now,
    createdBy: "Usuario",
    status: "completed",
    filters: input.filters,
  };
}

export async function getReport(id: number): Promise<Report | null> {
  const log = await prisma.auditLog.findFirst({
    where: { entityId: id, action: "REPORT_GENERATED" },
    include: { user: { select: { name: true } } },
  });
  if (!log) return null;
  const detail = log.detail ? safeJsonParse(log.detail) : {};
  return {
    id: log.id,
    name: detail?.name || "Reporte",
    description: detail?.description || "",
    format: detail?.format || "PDF",
    type: detail?.reportType || "general",
    createdAt: log.createdAt,
    createdBy: log.user?.name || "Sistema",
    status: "completed",
    filters: detail?.filters,
  };
}

export async function deleteReport(id: number): Promise<void> {
  await prisma.auditLog.deleteMany({
    where: { entityId: id, action: "REPORT_GENERATED" },
  });
}

export async function getReportDownload(id: number, companyId: number): Promise<{ report: Report; data: any } | null> {
  const report = await getReport(id);
  if (!report) return null;

  let data: any = {};
  switch (report.type) {
    case "ventas":
    case "revenue":
      data = await getSalesAnalytics({ period: "this_month" }, companyId);
      break;
    case "compras":
      data = await getPurchaseAnalytics({ period: "this_month" }, companyId);
      break;
    case "clientes":
      data = await getClientAnalytics({ period: "this_month" }, companyId);
      break;
    case "productos":
    case "productos_mas_vendidos":
    case "productos_menos_vendidos":
    case "stock_critico":
      data = await getProductAnalytics({ period: "this_month" }, companyId);
      break;
    case "categorias":
      data = await getCategoryAnalytics({ period: "this_month" }, companyId);
      break;
    case "inventario":
    case "productos_vencidos":
      data = await getInventoryAnalytics({ period: "this_month" }, companyId);
      break;
    case "caja":
      data = await getCashAnalytics({ period: "this_month" }, companyId);
      break;
    case "proveedores":
      data = await getProviderAnalytics({ period: "this_month" }, companyId);
      break;
    case "ganancias":
    case "rentabilidad":
    case "profit":
      data = await getRevenueAnalytics({ period: "this_month" }, companyId);
      break;
    default:
      data = await getDashboard({ period: "this_month" }, companyId);
  }

  return { report, data };
}

export async function getChartRevenue(filter: PeriodFilterInput, companyId: number): Promise<ChartData> {
  const range = await getDateRange(filter);
  const sales = await prisma.sale.findMany({
    where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
    include: { details: true },
  });

  const monthlyMap = new Map<string, { revenue: number; cost: number }>();
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { revenue: 0, cost: 0 });
  }

  sales.forEach((s) => {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap.has(key)) {
      const entry = monthlyMap.get(key)!;
      entry.revenue += s.total;
      entry.cost += s.details.reduce((sum, d) => sum + d.unitPrice * d.quantity, 0);
    }
  });

  const sorted = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  return {
    labels: sorted.map(([m]) => getMonthName(parseInt(m.split("-")[1]) - 1)),
    datasets: [
      {
        label: "Ingresos",
        data: sorted.map(([, v]) => v.revenue),
        borderColor: "#4F46E5",
      },
      {
        label: "Costos",
        data: sorted.map(([, v]) => v.cost),
        borderColor: "#EF4444",
      },
      {
        label: "Ganancias",
        data: sorted.map(([, v]) => v.revenue - v.cost),
        borderColor: "#10B981",
      },
    ],
  };
}

export async function getChartSales(filter: PeriodFilterInput, companyId: number): Promise<ChartData> {
  const range = await getDateRange(filter);
  const sales = await prisma.sale.findMany({
    where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
  });

  const dailyMap = new Map<string, number>();
  const current = new Date(range.startDate);
  while (current <= range.endDate) {
    const key = current.toISOString().split("T")[0];
    dailyMap.set(key, 0);
    current.setDate(current.getDate() + 1);
  }

  sales.forEach((s) => {
    const key = s.createdAt.toISOString().split("T")[0];
    if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key)! + s.total);
  });

  const sorted = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  return {
    labels: sorted.map(([d]) => d.split("-").slice(1).join("/")),
    datasets: [{ label: "Ventas", data: sorted.map(([, v]) => v), borderColor: "#4F46E5" }],
  };
}

export async function getChartCategories(
  filter: PeriodFilterInput,
  companyId: number,
  limit: number = 10
): Promise<ChartData> {
  const categories = await getCategoryAnalytics(filter, companyId);
  const top = categories.topCategories.slice(0, limit);
  return {
    labels: top.map((c) => c.categoryName),
    datasets: [
      { label: "Ventas", data: top.map((c) => c.sales), backgroundColor: CHART_COLORS },
    ],
  };
}

export async function getChartProducts(
  filter: PeriodFilterInput,
  companyId: number,
  limit: number = 10
): Promise<ChartData> {
  const products = await getProductAnalytics(filter, companyId);
  const top = products.bestSellers.slice(0, limit);
  return {
    labels: top.map((p) => p.productName),
    datasets: [
      { label: "Cantidad Vendida", data: top.map((p) => p.quantity), backgroundColor: CHART_COLORS },
    ],
  };
}

export async function getChartPayments(filter: PeriodFilterInput, companyId: number): Promise<ChartData> {
  const range = await getDateRange(filter);
  const payments = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
    _sum: { total: true },
    _count: { id: true },
  });

  const methodNames: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TARJETA: "Tarjeta",
    TRANSFERENCIA: "Transferencia",
    QR: "QR",
  };

  return {
    labels: payments.map((p) => methodNames[p.paymentMethod] || p.paymentMethod),
    datasets: [
      { label: "Monto", data: payments.map((p) => p._sum.total || 0), backgroundColor: CHART_COLORS },
    ],
  };
}

export async function getChartInventory(filter: PeriodFilterInput, companyId: number): Promise<ChartData> {
  const products = await prisma.product.findMany({
    where: { companyId, active: true },
    orderBy: { stock: "asc" },
    take: 10,
  });
  return {
    labels: products.map((p) => p.name),
    datasets: [
      { label: "Stock Actual", data: products.map((p) => p.stock), backgroundColor: ["#4F46E5"] },
    ],
  };
}

export async function getChartCustomers(filter: PeriodFilterInput, companyId: number): Promise<ChartData> {
  const range = await getDateRange(filter);
  const sales = await prisma.sale.findMany({
    where: { companyId, createdAt: { gte: range.startDate, lte: range.endDate }, status: "COMPLETADA" },
    include: { client: true },
  });

  const clientMap = new Map<string, { name: string; total: number }>();
  sales.forEach((s) => {
    const name = s.client.name;
    if (!clientMap.has(name)) clientMap.set(name, { name, total: 0 });
    clientMap.get(name)!.total += s.total;
  });

  const sorted = Array.from(clientMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    labels: sorted.map((c) => c.name),
    datasets: [
      { label: "Compras", data: sorted.map((c) => c.total), backgroundColor: CHART_COLORS },
    ],
  };
}
