export const PERIODS = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "quarter",
  "semester",
  "year",
  "custom",
] as const;

export const REPORT_TYPES = [
  "ventas",
  "compras",
  "ganancias",
  "clientes",
  "productos",
  "categorias",
  "inventario",
  "caja",
  "usuarios",
  "auditoria",
  "proveedores",
  "movimientos",
  "devoluciones",
  "stock_critico",
  "productos_vencidos",
  "productos_mas_vendidos",
  "productos_menos_vendidos",
  "rentabilidad",
  "revenue",
  "profit",
  "dashboard_ejecutivo",
] as const;

export const REPORT_FORMATS = ["PDF", "Excel", "CSV"] as const;

export const PERMISSIONS = {
  ANALYTICS_READ: "analytics.read",
  REPORTS_READ: "reports.read",
  REPORTS_GENERATE: "reports.generate",
  REPORTS_DOWNLOAD: "reports.download",
  REPORTS_DELETE: "reports.delete",
} as const;

export const CHART_COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

export const DEFAULT_PAGE_SIZE = 20;

export function getPeriodDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case "today":
      return { startDate: start, endDate: end };
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { startDate: yesterday, endDate: yesterdayEnd };
    }
    case "this_week": {
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff);
      return { startDate: start, endDate: end };
    }
    case "last_week": {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start.setDate(diff - 7);
      const lastWeekEnd = new Date(start);
      lastWeekEnd.setDate(start.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: lastWeekEnd };
    }
    case "this_month":
      start.setDate(1);
      return { startDate: start, endDate: end };
    case "last_month": {
      start.setMonth(start.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start, endDate: lastMonthEnd };
    }
    case "quarter": {
      start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
      return { startDate: start, endDate: end };
    }
    case "semester": {
      start.setMonth(Math.floor(now.getMonth() / 6) * 6, 1);
      return { startDate: start, endDate: end };
    }
    case "year":
      start.setMonth(0, 1);
      return { startDate: start, endDate: end };
    case "custom":
      if (startDate && endDate) {
        return {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        };
      }
      return { startDate: start, endDate: end };
    default:
      return { startDate: start, endDate: end };
  }
}

export function getPreviousPeriod(range: { startDate: Date; endDate: Date }) {
  const diff = range.endDate.getTime() - range.startDate.getTime();
  const prevStart = new Date(range.startDate.getTime() - diff - 1);
  const prevEnd = new Date(range.startDate.getTime() - 1);
  return { startDate: prevStart, endDate: prevEnd };
}