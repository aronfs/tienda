import { z } from "zod";

export const createProviderSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export const updateProviderSchema = z.object({
  name: z.string().min(2).optional(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
