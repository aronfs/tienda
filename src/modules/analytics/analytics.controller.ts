import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AppError } from "../../utils/appError";
import * as analyticsService from "./analytics.service";
import type { AuthRequest } from "../../middlewares/auth.middleware";
import type { PeriodFilterInput } from "./analytics.schema";
import prisma from "../../config/prisma";

export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getDashboard(req.query as any);
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "ANALYTICS_VIEW",
      entity: "Dashboard",
      entityId: 0,
      detail: "Dashboard consultado",
    },
  });
  sendSuccess(res, data, "Dashboard consultado correctamente");
});

export const getSalesAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getSalesAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de ventas consultada correctamente");
});

export const getRevenueAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getRevenueAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de ingresos consultada correctamente");
});

export const getPurchaseAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getPurchaseAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de compras consultada correctamente");
});

export const getProductAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getProductAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de productos consultada correctamente");
});

export const getCategoryAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getCategoryAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de categorías consultada correctamente");
});

export const getClientAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getClientAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de clientes consultada correctamente");
});

export const getProviderAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getProviderAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de proveedores consultada correctamente");
});

export const getInventoryAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getInventoryAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de inventario consultada correctamente");
});

export const getCashAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getCashAnalytics(req.query as any);
  sendSuccess(res, data, "Analítica de caja consultada correctamente");
});

export const listReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.listReports(req.query as any);
  sendSuccess(res, data, "Reportes listados correctamente");
});

export const generateReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.generateReport(req.body, req.user!.userId);
  sendSuccess(res, data, "Reporte generado correctamente", 201);
});

export const getReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getReport(Number(req.params.id));
  if (!data) throw new AppError("Reporte no encontrado", 404);
  sendSuccess(res, data, "Reporte consultado correctamente");
});

export const downloadReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getReportDownload(Number(req.params.id));
  if (!data) throw new AppError("Reporte no encontrado", 404);
  sendSuccess(res, data, "Reporte descargado correctamente");
});

export const deleteReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  await analyticsService.deleteReport(Number(req.params.id));
  sendSuccess(res, null, "Reporte eliminado correctamente");
});

export const getChartRevenue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getChartRevenue(req.query as any);
  sendSuccess(res, data);
});

export const getChartProfit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const range = await analyticsService.getChartRevenue(req.query as any);
  const profitData = {
    labels: range.labels,
    datasets: [range.datasets[2]],
  };
  sendSuccess(res, profitData);
});

export const getChartSales = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getChartSales(req.query as any);
  sendSuccess(res, data);
});

export const getChartCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const data = await analyticsService.getChartCategories(req.query as any, limit);
  sendSuccess(res, data);
});

export const getChartProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const data = await analyticsService.getChartProducts(req.query as any, limit);
  sendSuccess(res, data);
});

export const getChartPayments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getChartPayments(req.query as any);
  sendSuccess(res, data);
});

export const getChartInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getChartInventory(req.query as any);
  sendSuccess(res, data);
});

export const getChartCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getChartCustomers(req.query as any);
  sendSuccess(res, data);
});