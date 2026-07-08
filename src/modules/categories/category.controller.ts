import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as categoryService from "./category.service";

export const findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const categories = await categoryService.findAll(req.user!.companyId!);
  sendSuccess(res, categories);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await categoryService.create(req.body, req.user!.companyId!);
  sendSuccess(res, category, "Categoría creada correctamente", 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await categoryService.update(Number(req.params.id), req.body, req.user!.companyId!);
  sendSuccess(res, category, "Categoría actualizada correctamente");
});

export const deactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await categoryService.deactivate(Number(req.params.id), req.user!.companyId!);
  sendSuccess(res, category, "Categoría desactivada correctamente");
});
