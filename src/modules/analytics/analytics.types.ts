export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsFilter {
  period?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  productId?: number;
  providerId?: number;
  clientId?: number;
  userId?: number;
  paymentMethod?: string;
}

export interface DashboardSummary {
  salesToday: { count: number; total: number };
  salesMonth: { count: number; total: number };
  salesYear: { count: number; total: number };
  revenue: { total: number; cost: number; profit: number; margin: number };
  clients: { new: number; active: number };
  products: { total: number; active: number; outOfStock: number; lowStock: number };
  categories: { total: number };
  providers: { total: number };
  purchasesMonth: { count: number; total: number };
  purchasesYear: { count: number; total: number };
  cashRegister: { open: boolean; balance: number };
  lastSales: any[];
  lastPurchases: any[];
  alerts: Alert[];
  indicators: Indicator[];
}

export interface Alert {
  type: "critical" | "warning" | "info";
  message: string;
  count: number;
}

export interface Indicator {
  label: string;
  value: number | string;
  previous: number | string;
  variation: number;
  trend: "up" | "down" | "stable";
  format: string;
}

export interface SalesAnalytics {
  totalSales: number;
  countSales: number;
  averageTicket: number;
  maxSale: number;
  minSale: number;
  cancelledSales: number;
  byPaymentMethod: { method: string; total: number; count: number }[];
  byUser: { userId: number; userName: string; total: number; count: number }[];
  byHour: { hour: number; count: number; total: number }[];
  byDay: { date: string; count: number; total: number }[];
  byWeek: { week: number; count: number; total: number }[];
  byMonth: { month: string; count: number; total: number }[];
  comparison: { previous: { count: number; total: number }; current: { count: number; total: number }; variation: { count: number; total: number } };
}

export interface RevenueAnalytics {
  revenue: number;
  cost: number;
  profit: number;
  grossMargin: number;
  netMargin: number;
  averageOrderValue: number;
  revenueGrowth: number;
  profitGrowth: number;
  monthlyRevenue: { month: string; revenue: number; cost: number; profit: number }[];
  yearlyRevenue: { year: number; revenue: number; cost: number; profit: number }[];
}

export interface PurchaseAnalytics {
  today: { count: number; total: number };
  month: { count: number; total: number };
  byProvider: { providerId: number; providerName: string; count: number; total: number }[];
  averageCost: number;
  mainProvider: { id: number; name: string; total: number } | null;
  productsPurchased: number;
  amountInvested: number;
  variation: { previous: number; current: number; percentage: number };
}

export interface ProductAnalytics {
  bestSellers: { productId: number; productName: string; code: string; quantity: number; total: number }[];
  worstSellers: { productId: number; productName: string; code: string; quantity: number; total: number }[];
  highestProfit: { productId: number; productName: string; code: string; profit: number; margin: number }[];
  highestMargin: { productId: number; productName: string; code: string; margin: number }[];
  highestRotation: { productId: number; productName: string; code: string; rotation: number }[];
  noMovement: { productId: number; productName: string; code: string; stock: number }[];
  criticalStock: { productId: number; productName: string; code: string; stock: number; minStock: number }[];
  lowStock: { productId: number; productName: string; code: string; stock: number; minStock: number }[];
  outOfStock: { productId: number; productName: string; code: string }[];
  inventoryValue: { cost: number; sale: number; potentialProfit: number };
  immobilizedInventory: { productId: number; productName: string; code: string; stock: number; value: number }[];
}

export interface CategoryAnalytics {
  participation: { categoryId: number; categoryName: string; percentage: number; sales: number }[];
  sales: { categoryId: number; categoryName: string; total: number; count: number }[];
  profits: { categoryId: number; categoryName: string; profit: number; margin: number }[];
  products: { categoryId: number; categoryName: string; productCount: number }[];
  rotation: { categoryId: number; categoryName: string; rotation: number }[];
  topCategories: { categoryId: number; categoryName: string; sales: number; profit: number; percentage: number }[];
}

export interface ClientAnalytics {
  newClients: number;
  frequentClients: number;
  inactiveClients: number;
  topBuyers: { clientId: number; clientName: string; total: number; count: number }[];
  averagePurchase: number;
  totalPurchases: number;
  accumulatedValue: number;
}

export interface ProviderAnalytics {
  topProviders: { providerId: number; providerName: string; total: number; count: number }[];
  purchases: { count: number; total: number };
  amountInvested: number;
  products: { total: number };
  averageDeliveryTime: number;
  participation: { providerId: number; providerName: string; percentage: number }[];
}

export interface InventoryAnalytics {
  totalStock: number;
  inventoryValue: { cost: number; sale: number };
  lowStock: { productId: number; productName: string; code: string; stock: number; minStock: number }[];
  criticalStock: { productId: number; productName: string; code: string; stock: number; minStock: number }[];
  expiredProducts: { productId: number; productName: string; code: string }[];
  expiringProducts: { productId: number; productName: string; code: string; daysToExpire: number }[];
  rotation: { productId: number; productName: string; code: string; rotation: number }[];
  entries: { count: number; quantity: number };
  exits: { count: number; quantity: number };
  adjustments: { count: number; quantity: number };
  kardexSummary: { productId: number; productName: string; code: string; entries: number; exits: number; balance: number }[];
}

export interface CashAnalytics {
  openRegister: { id: number; userId: number; userName: string; openingDate: Date; initialAmount: number } | null;
  ingresos: number;
  egresos: number;
  saldo: number;
  salesByMethod: { method: string; total: number; count: number }[];
  differences: { expected: number; actual: number; difference: number };
  arqueos: { id: number; date: Date; expected: number; actual: number; difference: number; status: string }[];
}

export interface Report {
  id: number;
  name: string;
  description: string;
  format: string;
  type: string;
  createdAt: Date;
  createdBy: string;
  status: string;
  filters?: any;
  filePath?: string;
}

export interface GenerateReportInput {
  type: string;
  startDate: string;
  endDate: string;
  format: string;
  filters?: {
    categoryId?: number[];
    clientId?: number[];
    productId?: number[];
    providerId?: number[];
    userId?: number;
    paymentMethod?: string;
  };
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
  }[];
}