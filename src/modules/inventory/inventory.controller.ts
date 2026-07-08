import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as inventoryService from "./inventory.service";

export const getMovements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const movements = await inventoryService.getMovements(req.user!.companyId!, req.user!.branchId);
  sendSuccess(res, movements);
});

export const adjust = asyncHandler(async (req: AuthRequest, res: Response) => {
  const movement = await inventoryService.adjust(req.body, req.user!.userId, req.user!.companyId!, req.user!.branchId);
  sendSuccess(res, movement, "Inventario ajustado correctamente");
});
