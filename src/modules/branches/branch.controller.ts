import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AppError } from "../../utils/appError";
import type { AuthRequest } from "../../middlewares/auth.middleware";
import * as branchService from "./branch.service";

export const findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branches = await branchService.findAll(req.user!.userId);
  sendSuccess(res, branches);
});

export const findById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await branchService.findById(Number(req.params.id), req.user!.userId);
  sendSuccess(res, branch);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await branchService.create(req.body, req.user!.userId);
  sendSuccess(res, branch, "Sucursal creada correctamente", 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await branchService.update(Number(req.params.id), req.body, req.user!.userId);
  sendSuccess(res, branch, "Sucursal actualizada correctamente");
});

export const updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!status) throw new AppError("El estado es requerido", 400);
  const branch = await branchService.updateStatus(Number(req.params.id), status, req.user!.userId);
  sendSuccess(res, branch, "Estado actualizado correctamente");
});

export const setMain = asyncHandler(async (req: AuthRequest, res: Response) => {
  const branch = await branchService.setMain(Number(req.params.id), req.user!.userId);
  sendSuccess(res, branch, "Sucursal principal actualizada correctamente");
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  await branchService.remove(Number(req.params.id), req.user!.userId);
  sendSuccess(res, null, "Sucursal eliminada correctamente");
});