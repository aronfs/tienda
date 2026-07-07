import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { env } from "../config/env";

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: [],
    });
  }

  console.error("Error no controlado:", err);

  return res.status(500).json({
    success: false,
    message: env.nodeEnv === "development" ? err.message : "Error interno del servidor",
    errors: [],
  });
};
