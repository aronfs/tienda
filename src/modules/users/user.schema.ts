import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  roleId: z.number().int().positive("El rol es requerido"),
  companyId: z.number().int().positive().optional(),
  branchId: z.number().int().positive().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roleId: z.number().int().positive().optional(),
  companyId: z.number().int().positive().optional(),
  branchId: z.number().int().positive().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
