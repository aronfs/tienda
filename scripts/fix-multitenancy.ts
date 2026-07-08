import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script de corrección multiempresa.
 *
 * PRECAUCIÓN: Este script solo debe ejecutarse DESPUÉS de ejecutar
 * scripts/audit-multitenancy.ts y haber revisado el reporte.
 *
 * NO ejecutar automáticamente si hay datos críticos huérfanos.
 */
async function fix() {
  console.log("═══════════════════════════════════════════════");
  console.log("  CORRECCIÓN MULTIEMPRESA");
  console.log("═══════════════════════════════════════════════\n");

  // Verificar si hay datos críticos antes de continuar
  const productsNoCompany = await prisma.product.count({ where: { companyId: null } });
  const categoriesNoCompany = await prisma.category.count({ where: { companyId: null } });
  const providersNoCompany = await prisma.provider.count({ where: { companyId: null } });
  const clientsNoCompany = await prisma.client.count({ where: { companyId: null } });
  const salesNoCompany = await prisma.sale.count({ where: { companyId: null } });
  const purchasesNoCompany = await prisma.purchase.count({ where: { companyId: null } });

  const totalOrphans = productsNoCompany + categoriesNoCompany + providersNoCompany +
    clientsNoCompany + salesNoCompany + purchasesNoCompany;

  if (totalOrphans > 0) {
    console.log("❌  SE ENCONTRARON DATOS HUÉRFANOS.");
    console.log(`   Productos sin companyId: ${productsNoCompany}`);
    console.log(`   Categorías sin companyId: ${categoriesNoCompany}`);
    console.log(`   Proveedores sin companyId: ${providersNoCompany}`);
    console.log(`   Clientes sin companyId: ${clientsNoCompany}`);
    console.log(`   Ventas sin companyId: ${salesNoCompany}`);
    console.log(`   Compras sin companyId: ${purchasesNoCompany}`);
    console.log("\n   NO ES SEGURO CORREGIR AUTOMÁTICAMENTE.");
    console.log("   Ejecute primero scripts/audit-multitenancy.ts para revisar.");
    console.log("   Luego asigne companyId manualmente según corresponda.\n");
    return;
  }

  console.log("✅  No se encontraron datos huérfanos.");
  console.log("   Todos los datos tienen companyId asignado.\n");

  // Verificar que las restricciones únicas compuestas sean correctas
  console.log("Verificando restricciones únicas compuestas...");

  // Productos: @@unique([companyId, code])
  const dupProducts = await prisma.$queryRawUnsafe<Array<{ company_id: number; code: string; count: bigint }>>(
    `SELECT company_id, code, COUNT(*) FROM products GROUP BY company_id, code HAVING COUNT(*) > 1`
  );
  if (dupProducts.length > 0) {
    console.log(`⚠️  Productos duplicados por companyId+code: ${dupProducts.length}`);
    for (const d of dupProducts) {
      console.log(`   companyId=${d.company_id}, code=${d.code}, count=${d.count}`);
    }
  } else {
    console.log("✅  Productos: sin duplicados en companyId+code");
  }

  // Categorías: @@unique([companyId, name])
  const dupCategories = await prisma.$queryRawUnsafe<Array<{ company_id: number; name: string; count: bigint }>>(
    `SELECT company_id, name, COUNT(*) FROM categories GROUP BY company_id, name HAVING COUNT(*) > 1`
  );
  if (dupCategories.length > 0) {
    console.log(`⚠️  Categorías duplicadas por companyId+name: ${dupCategories.length}`);
  } else {
    console.log("✅  Categorías: sin duplicados en companyId+name");
  }

  // Proveedores: @@unique([companyId, name])
  const dupProviders = await prisma.$queryRawUnsafe<Array<{ company_id: number; name: string; count: bigint }>>(
    `SELECT company_id, name, COUNT(*) FROM providers GROUP BY company_id, name HAVING COUNT(*) > 1`
  );
  if (dupProviders.length > 0) {
    console.log(`⚠️  Proveedores duplicados por companyId+name: ${dupProviders.length}`);
  } else {
    console.log("✅  Proveedores: sin duplicados en companyId+name");
  }

  console.log("\n✅  Corrección completada.");
}

fix()
  .catch((e) => {
    console.error("Error en corrección:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
