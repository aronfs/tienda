import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed mínimo del sistema...");

  // ─── 1. LIMPIEZA ───────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.returnDetail.deleteMany();
  await prisma.return.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.saleDetail.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseDetail.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.product.deleteMany();
  await prisma.client.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.category.deleteMany();
  await prisma.invoiceResolution.deleteMany();
  await prisma.billingConfig.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.regionalConfig.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.company.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  console.log("Datos existentes eliminados");

  const salt = await bcrypt.genSalt(10);

  // ─── 2. PERMISOS ────────────────────────────────
  const permNames = [
    "products:create", "products:read", "products:update", "products:delete",
    "sales:create", "sales:read",
    "purchases:create", "purchases:read",
    "inventory:adjust",
    "cash:open", "cash:close",
    "reports:read", "users:manage", "settings:manage",
    "company:read", "company:update",
    "branches:create", "branches:read", "branches:update", "branches:delete",
    "taxes:create", "taxes:read", "taxes:update", "taxes:delete",
    "billing:read", "billing:update",
    "setup:initialize", "setup:read",
  ];
  await prisma.permission.createMany({
    data: permNames.map((name) => ({ name })),
  });
  const perms = await prisma.permission.findMany();
  const permMap = Object.fromEntries(perms.map((p) => [p.name, p.id]));

  // ─── 3. ROLES ───────────────────────────────────
  await prisma.role.createMany({
    data: [
      { name: "ADMINISTRADOR", description: "Acceso completo al sistema" },
      { name: "CAJERO", description: "Puede realizar ventas y operaciones de caja" },
      { name: "BODEGUERO", description: "Puede gestionar inventario y compras" },
      { name: "SUPERVISOR", description: "Supervisa operaciones" },
    ],
  });
  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  // ─── 4. ROLES × PERMISOS ────────────────────────
  const rolePerms = [
    { roleId: roleMap.ADMINISTRADOR, names: permNames },
    { roleId: roleMap.CAJERO, names: ["products:read", "sales:create", "sales:read", "cash:open", "cash:close"] },
    { roleId: roleMap.BODEGUERO, names: ["products:create", "products:read", "products:update", "purchases:create", "purchases:read", "inventory:adjust"] },
    { roleId: roleMap.SUPERVISOR, names: ["products:read", "products:update", "sales:read", "reports:read", "branches:read", "company:read"] },
  ];
  for (const rp of rolePerms) {
    await prisma.rolePermission.createMany({
      data: rp.names.map((n) => ({ roleId: rp.roleId, permissionId: permMap[n] })),
    });
  }
  console.log("Roles y permisos creados");

  // ─── 5. USUARIO ADMINISTRADOR ─────────────────
  // El administrador se crea SIN empresa ni sucursal.
  // El flujo de setup inicial debe asignarlo.
  await prisma.user.create({
    data: {
      name: "Administrador Principal",
      email: "admin@tienda.com",
      password: await bcrypt.hash("Admin123!", salt),
      roleId: roleMap.ADMINISTRADOR,
      companyId: null,
      branchId: null,
    },
    select: { id: true, name: true, email: true },
  });
  console.log("Usuario administrador creado (sin empresa asignada)");

  console.log("\n✅ Seed mínimo completado exitosamente!");
  console.log("   Sistema listo para configuración inicial.");
  console.log("   Usa POST /api/auth/login con admin@tienda.com / Admin123!");
  console.log("   Luego POST /api/setup/initialize para configurar empresa.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });