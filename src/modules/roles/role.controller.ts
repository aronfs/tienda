import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as roleService from "./role.service";

export const findAll = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await roleService.findAll();
  sendSuccess(res, roles);
});
