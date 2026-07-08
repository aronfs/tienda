import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as clientService from "./client.service";

export const findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const clients = await clientService.findAll(req.user!.companyId!);
  sendSuccess(res, clients);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await clientService.create(req.body, req.user!.companyId!);
  sendSuccess(res, client, "Cliente creado correctamente", 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await clientService.update(Number(req.params.id), req.body, req.user!.companyId!);
  sendSuccess(res, client, "Cliente actualizado correctamente");
});
