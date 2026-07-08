/*
  Warnings:

  - You are about to drop the `StoreConfig` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `totalLine` to the `SaleDetail` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('OPERATIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvoiceResolutionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'INACTIVE', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "TaxAppliesTo" AS ENUM ('SALE', 'PURCHASE', 'BOTH');

-- AlterTable
ALTER TABLE "CashRegister" ADD COLUMN     "branchId" INTEGER,
ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "branchId" INTEGER,
ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "taxId" INTEGER;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "branchId" INTEGER,
ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "branchId" INTEGER,
ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoicePrefix" TEXT,
ADD COLUMN     "invoiceResolutionId" INTEGER,
ADD COLUMN     "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SaleDetail" ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxId" INTEGER,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalLine" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "branchId" INTEGER,
ADD COLUMN     "companyId" INTEGER;

-- DropTable
DROP TABLE "StoreConfig";

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "legalName" TEXT NOT NULL,
    "commercialName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "mainAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "managerName" TEXT,
    "status" "BranchStatus" NOT NULL DEFAULT 'OPERATIVE',
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_configs" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'America/Guayaquil',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "decimalSeparator" TEXT NOT NULL DEFAULT '.',
    "thousandSeparator" TEXT NOT NULL DEFAULT ',',
    "language" TEXT NOT NULL DEFAULT 'es',
    "country" TEXT NOT NULL DEFAULT 'Ecuador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxes" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rate" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesTo" "TaxAppliesTo" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_resolutions" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "prefix" TEXT NOT NULL,
    "startNumber" INTEGER NOT NULL,
    "endNumber" INTEGER NOT NULL,
    "currentNumber" INTEGER NOT NULL,
    "authorizationCode" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceResolutionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_configs" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "invoicePrefixDefault" TEXT NOT NULL DEFAULT 'FAC',
    "invoiceFooterText" TEXT,
    "includeTaxInPrice" BOOLEAN NOT NULL DEFAULT false,
    "autoGenerateInvoiceNumber" BOOLEAN NOT NULL DEFAULT true,
    "allowInvoiceWithoutResolution" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_taxId_key" ON "companies"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "branches_companyId_code_key" ON "branches"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "regional_configs_companyId_key" ON "regional_configs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_configs_companyId_key" ON "billing_configs"("companyId");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_configs" ADD CONSTRAINT "regional_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_resolutions" ADD CONSTRAINT "invoice_resolutions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_resolutions" ADD CONSTRAINT "invoice_resolutions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_configs" ADD CONSTRAINT "billing_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxId_fkey" FOREIGN KEY ("taxId") REFERENCES "taxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_invoiceResolutionId_fkey" FOREIGN KEY ("invoiceResolutionId") REFERENCES "invoice_resolutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
