import prisma from "../../config/prisma";
import { AppError } from "../../utils/appError";
import type { SetupInitializeInput } from "./setup.schema";

export async function getStatus() {
  const company = await prisma.company.findFirst();
  const mainBranch = company ? await prisma.branch.findFirst({ where: { companyId: company.id, isMain: true } }) : null;
  const regionalConfig = company ? await prisma.regionalConfig.findUnique({ where: { companyId: company.id } }) : null;
  const defaultTax = company ? await prisma.tax.findFirst({ where: { companyId: company.id, isDefault: true, isActive: true } }) : null;
  const billingConfig = company ? await prisma.billingConfig.findUnique({ where: { companyId: company.id } }) : null;

  const isInitialized = !!(company && mainBranch && regionalConfig && defaultTax);

  let nextStep = "COMPLETED";
  if (!company) nextStep = "COMPANY_SETUP";
  else if (!mainBranch) nextStep = "BRANCH_SETUP";
  else if (!regionalConfig) nextStep = "REGIONAL_CONFIG_SETUP";
  else if (!defaultTax) nextStep = "TAX_SETUP";
  else if (!billingConfig) nextStep = "BILLING_CONFIG_SETUP";

  return {
    isInitialized,
    hasCompany: !!company,
    hasMainBranch: !!mainBranch,
    hasRegionalConfig: !!regionalConfig,
    hasDefaultTax: !!defaultTax,
    hasBillingConfig: !!billingConfig,
    nextStep,
  };
}

export async function initialize(data: SetupInitializeInput, userId: number) {
  const existing = await prisma.company.findFirst();
  if (existing) {
    throw new AppError("El sistema ya está inicializado", 400);
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        legalName: data.company.legalName,
        commercialName: data.company.commercialName,
        taxId: data.company.taxId,
        email: data.company.email,
        phone: data.company.phone || null,
        website: data.company.website || null,
        mainAddress: data.company.mainAddress || null,
        status: "ACTIVE",
      },
    });

    await tx.regionalConfig.create({
      data: {
        companyId: company.id,
        baseCurrency: data.regionalConfig.baseCurrency,
        timezone: data.regionalConfig.timezone,
        dateFormat: data.regionalConfig.dateFormat,
        decimalSeparator: data.regionalConfig.decimalSeparator,
        thousandSeparator: data.regionalConfig.thousandSeparator,
        language: data.regionalConfig.language,
        country: data.regionalConfig.country,
      },
    });

    const mainBranch = await tx.branch.create({
      data: {
        companyId: company.id,
        code: data.mainBranch.code,
        name: data.mainBranch.name,
        address: data.mainBranch.address || null,
        city: data.mainBranch.city || null,
        country: data.mainBranch.country || null,
        managerName: data.mainBranch.managerName || null,
        phone: data.mainBranch.phone || null,
        email: data.mainBranch.email || null,
        status: "OPERATIVE",
        isMain: true,
      },
    });

    for (const taxData of data.taxes) {
      await tx.tax.create({
        data: {
          companyId: company.id,
          name: taxData.name,
          description: taxData.description || null,
          rate: taxData.rate,
          isDefault: taxData.isDefault,
          isActive: true,
          appliesTo: taxData.appliesTo as any,
        },
      });
    }

    await tx.billingConfig.create({
      data: {
        companyId: company.id,
        invoicePrefixDefault: data.billingConfig.invoicePrefixDefault,
        invoiceFooterText: data.billingConfig.invoiceFooterText || null,
        includeTaxInPrice: data.billingConfig.includeTaxInPrice,
        autoGenerateInvoiceNumber: data.billingConfig.autoGenerateInvoiceNumber,
        allowInvoiceWithoutResolution: data.billingConfig.allowInvoiceWithoutResolution,
      },
    });

    if (data.invoiceResolution) {
      await tx.invoiceResolution.create({
        data: {
          companyId: company.id,
          branchId: mainBranch.id,
          prefix: data.invoiceResolution.prefix,
          startNumber: data.invoiceResolution.startNumber,
          endNumber: data.invoiceResolution.endNumber,
          currentNumber: data.invoiceResolution.currentNumber,
          authorizationCode: data.invoiceResolution.authorizationCode || null,
          validFrom: new Date(data.invoiceResolution.validFrom),
          validUntil: new Date(data.invoiceResolution.validUntil),
          status: "ACTIVE",
        },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        companyId: company.id,
        branchId: mainBranch.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "SETUP_INITIALIZE",
        entity: "Company",
        entityId: company.id,
        detail: `Sistema inicializado: ${company.legalName}`,
      },
    });

    return {
      company,
      mainBranch,
      regionalConfig: data.regionalConfig,
      taxes: data.taxes,
      billingConfig: data.billingConfig,
      invoiceResolution: data.invoiceResolution || null,
    };
  });
}