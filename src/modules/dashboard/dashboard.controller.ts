import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as dashboardService from "./dashboard.service";

export const getSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const summary = await dashboardService.getSummary(req.user!.companyId!);
  sendSuccess(res, summary);
});
