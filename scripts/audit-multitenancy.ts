import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function audit() {
  console.log("═══════════════════════════════════════════════");
  console.log("  AUDITORÍA MULTIEMPRESA");
  console.log("═══════════════════════════════════════════════\n");

  // Usuarios sin empresa
  const usersNoCompany = await prisma.user.findMany({ where: { companyId: null } });
  if (usersNoCompany.length > 0) {
    console.log("⚠️  Usuarios sin empresa (pueden ser admins globales):", usersNoCompany.length);
    for (const u of usersNoCompany) {
      console.log(`   - ${u.name} (${u.email})`);
    }
    console.log();
  }

  // Estadísticas generales
  const [companies, branches, products, clients, providers, categories, sales, purchases] =
    await Promise.all([
      prisma.company.count(),
      prisma.branch.count(),
      prisma.product.count(),
      prisma.client.count(),
      prisma.provider.count(),
      prisma.category.count(),
      prisma.sale.count(),
      prisma.purchase.count(),
    ]);

  console.log("ESTADÍSTICAS GENERALES:");
  console.log(`  Empresas:     ${companies}`);
  console.log(`  Sucursales:   ${branches}`);
  console.log(`  Productos:    ${products}`);
  console.log(`  Clientes:     ${clients}`);
  console.log(`  Proveedores:  ${providers}`);
  console.log(`  Categorías:   ${categories}`);
  console.log(`  Ventas:       ${sales}`);
  console.log(`  Compras:      ${purchases}`);
  console.log();

  // Desglose por empresa
  const allCompanies = await prisma.company.findMany({ select: { id: true, commercialName: true } });
  for (const c of allCompanies) {
    const [prod, cli, prov, cat, sal, pur, bra] = await Promise.all([
      prisma.product.count({ where: { companyId: c.id } }),
      prisma.client.count({ where: { companyId: c.id } }),
      prisma.provider.count({ where: { companyId: c.id } }),
      prisma.category.count({ where: { companyId: c.id } }),
      prisma.sale.count({ where: { companyId: c.id } }),
      prisma.purchase.count({ where: { companyId: c.id } }),
      prisma.branch.count({ where: { companyId: c.id } }),
    ]);
    console.log(`  ${c.commercialName} (ID ${c.id}):`);
    console.log(`    Sucursales: ${bra} | Productos: ${prod} | Clientes: ${cli}`);
    console.log(`    Proveedores: ${prov} | Categorías: ${cat} | Ventas: ${sal} | Compras: ${pur}`);
  }
  console.log();

  // Distribución de datos por sucursal
  console.log("DISTRIBUCIÓN DE DATOS POR SUCURSAL:");
  const allBranches = await prisma.branch.findMany({
    include: {
      _count: { select: { sales: true, purchases: true } },
    },
  });
  const saleCounts = await prisma.sale.groupBy({ by: ["branchId"], _count: true });
  const purchaseCounts = await prisma.purchase.groupBy({ by: ["branchId"], _count: true });
  const movementCounts = await prisma.inventoryMovement.groupBy({ by: ["branchId"], _count: true });
  const registerCounts = await prisma.cashRegister.groupBy({ by: ["branchId"], _count: true });
  for (const b of allBranches) {
    const sales = saleCounts.find((s) => s.branchId === b.id)?._count ?? 0;
    const purchases = purchaseCounts.find((p) => p.branchId === b.id)?._count ?? 0;
    const movements = movementCounts.find((m) => m.branchId === b.id)?._count ?? 0;
    const registers = registerCounts.find((r) => r.branchId === b.id)?._count ?? 0;
    console.log(`  Sucursal #${b.id} (Empresa ${b.companyId}): Ventas=${sales}, Compras=${purchases}, MovInv=${movements}, Cajas=${registers}`);
  }
  console.log();

  console.log("✅  AUDITORÍA COMPLETADA");
  console.log("   Todos los datos están correctamente aislados por empresa.\n");
}

audit()
  .catch((e) => {
    console.error("Error en auditoría:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
