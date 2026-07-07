import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as authService from "./auth.service";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  sendSuccess(res, user, "Usuario registrado correctamente", 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  sendSuccess(res, result, "Inicio de sesión exitoso");
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await authService.getMe(req.user!.userId);
  sendSuccess(res, user);
});
