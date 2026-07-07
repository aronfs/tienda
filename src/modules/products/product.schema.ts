import { z } from "zod";

export const createProductSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
  barcode: z.string().optional(),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  categoryId: z.number().int().positive("La categoría es requerida"),
  providerId: z.number().int().positive("El proveedor es requerido"),
  purchasePrice: z.number().min(0, "El precio de compra no puede ser negativo"),
  salePrice: z.number().min(0, "El precio de venta no puede ser negativo"),
  stock: z.number().int().min(0, "El stock no puede ser negativo").default(0),
  minStock: z.number().int().min(0).default(0),
});

export const updateProductSchema = z.object({
  code: z.string().min(1).optional(),
  barcode: z.string().optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  providerId: z.number().int().positive().optional(),
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
