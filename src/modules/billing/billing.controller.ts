import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthRequest } from "../../middlewares/auth.middleware";
import * as billingService from "./billing.service";

export const getConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await billingService.getConfig(req.user!.userId);
  sendSuccess(res, config);
});

export const updateConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const config = await billingService.updateConfig(req.user!.userId, req.body);
  sendSuccess(res, config, "Configuración de facturación actualizada correctamente");
});

export const getResolutions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const resolutions = await billingService.getResolutions(req.user!.userId);
  sendSuccess(res, resolutions);
});

export const getResolution = asyncHandler(async (req: AuthRequest, res: Response) => {
  const resolution = await billingService.getResolution(Number(req.params.id), req.user!.userId);
  sendSuccess(res, resolution);
});

export const createResolution = asyncHandler(async (req: AuthRequest, res: Response) => {
  const resolution = await billingService.createResolution(req.body, req.user!.userId);
  sendSuccess(res, resolution, "Resolución creada correctamente", 201);
});

export const updateResolution = asyncHandler(async (req: AuthRequest, res: Response) => {
  const resolution = await billingService.updateResolution(Number(req.params.id), req.body, req.user!.userId);
  sendSuccess(res, resolution, "Resolución actualizada correctamente");
});

export const updateResolutionStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const resolution = await billingService.updateResolutionStatus(Number(req.params.id), status, req.user!.userId);
  sendSuccess(res, resolution, "Estado actualizado correctamente");
});

export const deleteResolution = asyncHandler(async (req: AuthRequest, res: Response) => {
  await billingService.deleteResolution(Number(req.params.id), req.user!.userId);
  sendSuccess(res, null, "Resolución eliminada correctamente");
});

export const getNextInvoiceNumber = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await billingService.getNextInvoiceNumber(req.user!.userId);
  sendSuccess(res, result);
});