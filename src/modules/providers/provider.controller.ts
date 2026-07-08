import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as providerService from "./provider.service";

export const findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const providers = await providerService.findAll(req.user!.companyId!);
  sendSuccess(res, providers);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const provider = await providerService.create(req.body, req.user!.companyId!);
  sendSuccess(res, provider, "Proveedor creado correctamente", 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const provider = await providerService.update(Number(req.params.id), req.body, req.user!.companyId!);
  sendSuccess(res, provider, "Proveedor actualizado correctamente");
});

export const deactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const provider = await providerService.deactivate(Number(req.params.id), req.user!.companyId!);
  sendSuccess(res, provider, "Proveedor desactivado correctamente");
});
