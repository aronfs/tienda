import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import type { AuthRequest } from "../../middlewares/auth.middleware";
import * as companyService from "./company.service";

export const getMyCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const company = await companyService.getMyCompany(req.user!.userId);
  sendSuccess(res, company, "Empresa consultada correctamente");
});

export const updateMyCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
  const company = await companyService.updateMyCompany(req.user!.userId, req.body);
  sendSuccess(res, company, "Empresa actualizada correctamente");
});

export const updateLogo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { logoUrl } = req.body;
  const result = await companyService.updateLogo(req.user!.userId, logoUrl);
  sendSuccess(res, result, "Logo actualizado correctamente");
});