import { z } from "zod";

const paymentMethodEnum = z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "QR"]);

export const saleDetailSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
  discount: z.number().min(0).default(0),
});

export const createSaleSchema = z.object({
  clientId: z.number().int().positive().default(1),
  details: z.array(saleDetailSchema).min(1, "Debe tener al menos un detalle"),
  discount: z.number().min(0).default(0),
  paymentMethod: paymentMethodEnum.default("EFECTIVO"),
  branchId: z.number().int().positive().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
