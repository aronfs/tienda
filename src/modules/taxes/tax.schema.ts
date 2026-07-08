import { z } from "zod";

export const createTaxSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  rate: z.number().min(0, "La tasa no puede ser negativa"),
  isDefault: z.boolean().default(false),
  appliesTo: z.enum(["SALE", "PURCHASE", "BOTH"]).default("BOTH"),
});

export const updateTaxSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  rate: z.number().min(0).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  appliesTo: z.enum(["SALE", "PURCHASE", "BOTH"]).optional(),
});

export type CreateTaxInput = z.infer<typeof createTaxSchema>;
export type UpdateTaxInput = z.infer<typeof updateTaxSchema>;