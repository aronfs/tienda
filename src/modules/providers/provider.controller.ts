import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as providerService from "./provider.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const providers = await providerService.findAll();
  sendSuccess(res, providers);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const provider = await providerService.create(req.body);
  sendSuccess(res, provider, "Proveedor creado correctamente", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const provider = await providerService.update(Number(req.params.id), req.body);
  sendSuccess(res, provider, "Proveedor actualizado correctamente");
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const provider = await providerService.deactivate(Number(req.params.id));
  sendSuccess(res, provider, "Proveedor desactivado correctamente");
});
