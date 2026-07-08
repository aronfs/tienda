import { z } from "zod";

export const updateCompanySchema = z.object({
  legalName: z.string().min(3).optional(),
  commercialName: z.string().min(2).optional(),
  taxId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  mainAddress: z.string().optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;