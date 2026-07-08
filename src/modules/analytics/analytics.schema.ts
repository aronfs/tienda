import { z } from "zod";
import { PERIODS, REPORT_TYPES, REPORT_FORMATS } from "./analytics.constants";

export const periodFilterSchema = z.object({
  period: z.enum(PERIODS).optional().default("this_month"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  productId: z.coerce.number().optional(),
  providerId: z.coerce.number().optional(),
  clientId: z.coerce.number().optional(),
  userId: z.coerce.number().optional(),
  paymentMethod: z.string().optional(),
});

export const generateReportSchema = z.object({
  type: z.enum(REPORT_TYPES),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(REPORT_FORMATS),
  filters: z
    .object({
      categoryId: z.array(z.number()).optional(),
      clientId: z.array(z.number()).optional(),
      productId: z.array(z.number()).optional(),
      providerId: z.array(z.number()).optional(),
      userId: z.number().optional(),
      paymentMethod: z.string().optional(),
    })
    .optional(),
});

export const chartQuerySchema = z.object({
  period: z.enum(PERIODS).optional().default("this_month"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().optional().default(10),
});

export type PeriodFilterInput = z.infer<typeof periodFilterSchema>;
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type ChartQueryInput = z.infer<typeof chartQuerySchema>;