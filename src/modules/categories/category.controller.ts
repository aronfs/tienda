import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as categoryService from "./category.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await categoryService.findAll();
  sendSuccess(res, categories);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.create(req.body);
  sendSuccess(res, category, "Categoría creada correctamente", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.update(Number(req.params.id), req.body);
  sendSuccess(res, category, "Categoría actualizada correctamente");
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.deactivate(Number(req.params.id));
  sendSuccess(res, category, "Categoría desactivada correctamente");
});
