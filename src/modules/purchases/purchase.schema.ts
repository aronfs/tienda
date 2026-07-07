import { z } from "zod";

export const purchaseDetailSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
  unitCost: z.number().min(0, "El costo unitario no puede ser negativo"),
});

export const createPurchaseSchema = z.object({
  providerId: z.number().int().positive("El proveedor es requerido"),
  series: z.string().optional(),
  number: z.number().int().optional(),
  details: z.array(purchaseDetailSchema).min(1, "Debe tener al menos un detalle"),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
