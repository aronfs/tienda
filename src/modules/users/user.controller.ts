import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as userService from "./user.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const users = await userService.findAll();
  sendSuccess(res, users);
});

export const findById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.findById(Number(req.params.id));
  sendSuccess(res, user);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.create(req.body);
  sendSuccess(res, user, "Usuario creado correctamente", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.update(Number(req.params.id), req.body);
  sendSuccess(res, user, "Usuario actualizado correctamente");
});

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.deactivate(Number(req.params.id));
  sendSuccess(res, user, "Usuario desactivado correctamente");
});
