import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as purchaseService from "./purchase.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const purchases = await purchaseService.findAll();
  sendSuccess(res, purchases);
});

export const findById = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await purchaseService.findById(Number(req.params.id));
  sendSuccess(res, purchase);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const purchase = await purchaseService.create(req.body, req.user!.userId);
  sendSuccess(res, purchase, "Compra registrada correctamente", 201);
});
