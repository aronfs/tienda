import { z } from "zod";

export const setupInitializeSchema = z.object({
  company: z.object({
    legalName: z.string().min(3, "La razón social es requerida"),
    commercialName: z.string().min(2, "El nombre comercial es requerido"),
    taxId: z.string().min(1, "El RUC/NIT es requerido"),
    email: z.string().email("Correo inválido"),
    phone: z.string().optional(),
    website: z.string().optional(),
    mainAddress: z.string().optional(),
  }),
  regionalConfig: z.object({
    baseCurrency: z.string().default("USD"),
    timezone: z.string().default("America/Guayaquil"),
    dateFormat: z.string().default("DD/MM/YYYY"),
    decimalSeparator: z.string().default("."),
    thousandSeparator: z.string().default(","),
    language: z.string().default("es"),
    country: z.string().default("Ecuador"),
  }),
  mainBranch: z.object({
    code: z.string().min(1, "El código de sucursal es requerido"),
    name: z.string().min(2, "El nombre de sucursal es requerido"),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    managerName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }),
  taxes: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      rate: z.number().min(0, "La tasa no puede ser negativa"),
      isDefault: z.boolean().default(false),
      appliesTo: z.enum(["SALE", "PURCHASE", "BOTH"]).default("BOTH"),
    })
  ).min(1, "Debe crear al menos un impuesto"),
  billingConfig: z.object({
    invoicePrefixDefault: z.string().default("FAC"),
    invoiceFooterText: z.string().optional(),
    includeTaxInPrice: z.boolean().default(false),
    autoGenerateInvoiceNumber: z.boolean().default(true),
    allowInvoiceWithoutResolution: z.boolean().default(false),
  }),
  invoiceResolution: z
    .object({
      prefix: z.string().min(1),
      startNumber: z.number().int().positive(),
      endNumber: z.number().int().positive(),
      currentNumber: z.number().int().positive(),
      authorizationCode: z.string().optional(),
      validFrom: z.string(),
      validUntil: z.string(),
    })
    .optional(),
});

export type SetupInitializeInput = z.infer<typeof setupInitializeSchema>;