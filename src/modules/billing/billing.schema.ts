import { z } from "zod";

export const billingConfigSchema = z.object({
  invoicePrefixDefault: z.string().default("FAC").optional(),
  invoiceFooterText: z.string().optional(),
  includeTaxInPrice: z.boolean().optional(),
  autoGenerateInvoiceNumber: z.boolean().optional(),
  allowInvoiceWithoutResolution: z.boolean().optional(),
});

export const createInvoiceResolutionSchema = z.object({
  branchId: z.number().int().positive().optional(),
  prefix: z.string().min(1, "El prefijo es requerido"),
  startNumber: z.number().int().positive(),
  endNumber: z.number().int().positive(),
  currentNumber: z.number().int().positive(),
  authorizationCode: z.string().optional(),
  validFrom: z.string(),
  validUntil: z.string(),
});

export const updateInvoiceResolutionSchema = z.object({
  prefix: z.string().min(1).optional(),
  startNumber: z.number().int().positive().optional(),
  endNumber: z.number().int().positive().optional(),
  currentNumber: z.number().int().positive().optional(),
  authorizationCode: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "INACTIVE", "EXHAUSTED"]).optional(),
});

export type BillingConfigInput = z.infer<typeof billingConfigSchema>;
export type CreateResolutionInput = z.infer<typeof createInvoiceResolutionSchema>;
export type UpdateResolutionInput = z.infer<typeof updateInvoiceResolutionSchema>;