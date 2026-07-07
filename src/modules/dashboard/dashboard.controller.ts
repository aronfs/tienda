import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as dashboardService from "./dashboard.service";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await dashboardService.getSummary();
  sendSuccess(res, summary);
});
