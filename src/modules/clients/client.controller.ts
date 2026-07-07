import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as clientService from "./client.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const clients = await clientService.findAll();
  sendSuccess(res, clients);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.create(req.body);
  sendSuccess(res, client, "Cliente creado correctamente", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const client = await clientService.update(Number(req.params.id), req.body);
  sendSuccess(res, client, "Cliente actualizado correctamente");
});
