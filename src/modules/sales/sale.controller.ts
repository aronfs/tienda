import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as saleService from "./sale.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const sales = await saleService.findAll();
  sendSuccess(res, sales);
});

export const findById = asyncHandler(async (req: Request, res: Response) => {
  const sale = await saleService.findById(Number(req.params.id));
  sendSuccess(res, sale);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sale = await saleService.create(req.body, req.user!.userId, req.user!.roleName);
  sendSuccess(res, sale, "Venta registrada correctamente", 201);
});

export const cancel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sale = await saleService.cancel(Number(req.params.id), req.user!.userId);
  sendSuccess(res, sale, "Venta anulada correctamente");
});
