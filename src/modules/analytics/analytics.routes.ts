import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import { PERMISSIONS } from "./analytics.constants";
import { periodFilterSchema, generateReportSchema, chartQuerySchema } from "./analytics.schema";
import * as analyticsController from "./analytics.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/dashboard",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getDashboard
);

router.get(
  "/sales",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getSalesAnalytics
);

router.get(
  "/revenue",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getRevenueAnalytics
);

router.get(
  "/purchases",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getPurchaseAnalytics
);

router.get(
  "/products",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getProductAnalytics
);

router.get(
  "/categories",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getCategoryAnalytics
);

router.get(
  "/clients",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getClientAnalytics
);

router.get(
  "/providers",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getProviderAnalytics
);

router.get(
  "/inventory",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getInventoryAnalytics
);

router.get(
  "/cash",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getCashAnalytics
);

router.get(
  "/charts/revenue",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartRevenue
);

router.get(
  "/charts/profit",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartProfit
);

router.get(
  "/charts/sales",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartSales
);

router.get(
  "/charts/categories",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartCategories
);

router.get(
  "/charts/products",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartProducts
);

router.get(
  "/charts/payments",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartPayments
);

router.get(
  "/charts/inventory",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartInventory
);

router.get(
  "/charts/customers",
  authorize(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getChartCustomers
);

router.get(
  "/reports",
  authorize(PERMISSIONS.REPORTS_READ),
  analyticsController.listReports
);

router.post(
  "/reports/generate",
  authorize(PERMISSIONS.REPORTS_GENERATE),
  validate(generateReportSchema),
  analyticsController.generateReport
);

router.get(
  "/reports/:id",
  authorize(PERMISSIONS.REPORTS_READ),
  analyticsController.getReport
);

router.get(
  "/reports/:id/download",
  authorize(PERMISSIONS.REPORTS_DOWNLOAD),
  analyticsController.downloadReport
);

router.delete(
  "/reports/:id",
  authorize(PERMISSIONS.REPORTS_DELETE),
  analyticsController.deleteReport
);

export default router;