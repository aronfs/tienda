import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as cashRegisterService from "./cashRegister.service";

export const openRegister = asyncHandler(async (req: AuthRequest, res: Response) => {
  const register = await cashRegisterService.openRegister(
    req.user!.userId,
    req.body.initialAmount,
    req.user!.companyId!,
    req.user!.branchId
  );
  sendSuccess(res, register, "Caja abierta correctamente", 201);
});

export const closeRegister = asyncHandler(async (req: AuthRequest, res: Response) => {
  const register = await cashRegisterService.closeRegister(
    req.user!.userId,
    req.body.actualTotal,
    req.body.observations,
    req.user!.companyId!,
    req.user!.branchId
  );
  sendSuccess(res, register, "Caja cerrada correctamente");
});

export const getCurrent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const register = await cashRegisterService.getCurrent(req.user!.userId, req.user!.companyId!, req.user!.branchId);
  sendSuccess(res, register);
});

export const getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const history = await cashRegisterService.getHistory(req.user!.companyId!);
  sendSuccess(res, history);
});
