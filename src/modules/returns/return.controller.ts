import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as returnService from "./return.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const returns = await returnService.findAll();
  sendSuccess(res, returns);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const returnRecord = await returnService.create(req.body, req.user!.userId);
  sendSuccess(res, returnRecord, "Devolución registrada correctamente", 201);
});
