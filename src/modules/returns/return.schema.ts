import { z } from "zod";

export const returnDetailSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

export const createReturnSchema = z.object({
  saleId: z.number().int().positive("La venta es requerida"),
  reason: z.string().min(5, "La razón debe tener al menos 5 caracteres"),
  details: z.array(returnDetailSchema).min(1, "Debe tener al menos un detalle"),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
