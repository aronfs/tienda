import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AppError } from "../../utils/appError";
import type { AuthRequest } from "../../middlewares/auth.middleware";
import * as taxService from "./tax.service";

export const findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const taxes = await taxService.findAll(req.user!.userId);
  sendSuccess(res, taxes);
});

export const findDefault = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tax = await taxService.findDefault(req.user!.userId);
  sendSuccess(res, tax);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tax = await taxService.create(req.body, req.user!.userId);
  sendSuccess(res, tax, "Impuesto creado correctamente", 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tax = await taxService.update(Number(req.params.id), req.body, req.user!.userId);
  sendSuccess(res, tax, "Impuesto actualizado correctamente");
});

export const updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") throw new AppError("isActive es requerido", 400);
  const tax = await taxService.updateStatus(Number(req.params.id), isActive, req.user!.userId);
  sendSuccess(res, tax, "Estado actualizado correctamente");
});

export const setDefault = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tax = await taxService.setDefault(Number(req.params.id), req.user!.userId);
  sendSuccess(res, tax, "Impuesto default actualizado correctamente");
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  await taxService.remove(Number(req.params.id), req.user!.userId);
  sendSuccess(res, null, "Impuesto eliminado correctamente");
});