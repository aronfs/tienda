import { z } from "zod";

export const inventoryAdjustSchema = z.object({
  productId: z.number().int().positive("El producto es requerido"),
  quantity: z.number().int("La cantidad debe ser un número entero"),
  note: z.string().optional(),
});

export type InventoryAdjustInput = z.infer<typeof inventoryAdjustSchema>;
