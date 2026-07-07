import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as productService from "./product.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const products = await productService.findAll();
  sendSuccess(res, products);
});

export const findById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.findById(Number(req.params.id));
  sendSuccess(res, product);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.create(req.body);
  sendSuccess(res, product, "Producto creado correctamente", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.update(Number(req.params.id), req.body);
  sendSuccess(res, product, "Producto actualizado correctamente");
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.deactivate(Number(req.params.id));
  sendSuccess(res, product, "Producto desactivado correctamente");
});

export const getLowStock = asyncHandler(async (_req: Request, res: Response) => {
  const products = await productService.getLowStock();
  sendSuccess(res, products);
});
