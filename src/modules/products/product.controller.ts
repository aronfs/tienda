import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as productService from "./product.service";

export const findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const products = await productService.findAll(req.user!.companyId!, req.user!.branchId);
  sendSuccess(res, products);
});

export const findById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.findById(Number(req.params.id), req.user!.companyId!);
  sendSuccess(res, product);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.create(req.body, req.user!.companyId!, req.user!.branchId, req.user!.userId);
  sendSuccess(res, product, "Producto creado correctamente", 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.update(Number(req.params.id), req.body, req.user!.companyId!);
  sendSuccess(res, product, "Producto actualizado correctamente");
});

export const deactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.deactivate(Number(req.params.id), req.user!.companyId!);
  sendSuccess(res, product, "Producto desactivado correctamente");
});

export const getLowStock = asyncHandler(async (req: AuthRequest, res: Response) => {
  const products = await productService.getLowStock(req.user!.companyId!);
  sendSuccess(res, products);
});
