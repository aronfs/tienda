import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthRequest } from "../../middlewares/auth.middleware";
import * as setupService from "./setup.service";

export const getStatus = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const status = await setupService.getStatus();
  sendSuccess(res, status, "Estado de configuración obtenido correctamente");
});

export const initialize = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await setupService.initialize(req.body, req.user!.userId);
  sendSuccess(res, result, "Sistema inicializado correctamente", 201);
});