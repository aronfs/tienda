export function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function calculateMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return Number((((revenue - cost) / revenue) * 100).toFixed(2));
}

export function calculateRotation(soldQuantity: number, currentStock: number): number {
  if (currentStock === 0) return soldQuantity > 0 ? Infinity : 0;
  return Number((soldQuantity / currentStock).toFixed(2));
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = String(keyFn(item));
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function getMonthName(monthIndex: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return months[monthIndex] || `Mes ${monthIndex + 1}`;
}

export function getTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

export function getChartTrend(data: number[]): "up" | "down" | "stable" {
  if (data.length < 2) return "stable";
  const first = data[0];
  const last = data[data.length - 1];
  return getTrend(last, first);
}