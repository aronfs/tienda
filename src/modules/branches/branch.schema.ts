import { z } from "zod";

const branchStatusEnum = z.enum(["OPERATIVE", "MAINTENANCE", "INACTIVE"]);

export const createBranchSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  managerName: z.string().optional(),
  isMain: z.boolean().default(false),
});

export const updateBranchSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  managerName: z.string().optional(),
  status: branchStatusEnum.optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;