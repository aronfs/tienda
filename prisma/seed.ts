import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  const salt = await bcrypt.genSalt(10);

  const permissionNames = [
    "products:create",
    "products:read",
    "products:update",
    "products:delete",
    "sales:create",
    "sales:read",
    "purchases:create",
    "purchases:read",
    "inventory:adjust",
    "cash:open",
    "cash:close",
    "reports:read",
    "users:manage",
    "settings:manage",
  ];

  const permissions = await Promise.all(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  console.log("Permisos creados");

  const permissionsMap = Object.fromEntries(
    permissions.map((p) => [p.name, p.id])
  );

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMINISTRADOR" },
    update: {},
    create: {
      name: "ADMINISTRADOR",
      description: "Acceso completo al sistema",
    },
  });

  const cajeroRole = await prisma.role.upsert({
    where: { name: "CAJERO" },
    update: {},
    create: {
      name: "CAJERO",
      description: "Puede realizar ventas y operaciones de caja",
    },
  });

  const bodegueroRole = await prisma.role.upsert({
    where: { name: "BODEGUERO" },
    update: {},
    create: {
      name: "BODEGUERO",
      description: "Puede gestionar inventario y compras",
    },
  });
  console.log("Roles creados");

  const adminPermissions = permissionNames;
  const cajeroPermissions = [
    "products:read",
    "sales:create",
    "sales:read",
    "cash:open",
    "cash:close",
  ];
  const bodegueroPermissions = [
    "products:create",
    "products:read",
    "products:update",
    "purchases:create",
    "purchases:read",
    "inventory:adjust",
  ];

  for (const role of [
    { id: adminRole.id, perms: adminPermissions },
    { id: cajeroRole.id, perms: cajeroPermissions },
    { id: bodegueroRole.id, perms: bodegueroPermissions },
  ]) {
    for (const permName of role.perms) {
      const permId = permissionsMap[permName];
      if (permId) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }
  console.log("Permisos asignados a roles");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@tienda.com" },
    update: {},
    create: {
      name: "Administrador Principal",
      email: "admin@tienda.com",
      password: await bcrypt.hash("Admin123!", salt),
      roleId: adminRole.id,
    },
  });

  const cajeroUser = await prisma.user.upsert({
    where: { email: "cajero@tienda.com" },
    update: {},
    create: {
      name: "Cajero Prueba",
      email: "cajero@tienda.com",
      password: await bcrypt.hash("Cajero123!", salt),
      roleId: cajeroRole.id,
    },
  });

  const bodegueroUser = await prisma.user.upsert({
    where: { email: "bodega@tienda.com" },
    update: {},
    create: {
      name: "Bodeguero Prueba",
      email: "bodega@tienda.com",
      password: await bcrypt.hash("Bodega123!", salt),
      roleId: bodegueroRole.id,
    },
  });
  console.log("Usuarios creados");

  const categories = await Promise.all(
    ["Bebidas", "Abarrotes", "Limpieza", "Lácteos", "Snacks"].map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const categoriesMap = Object.fromEntries(
    categories.map((c) => [c.name, c.id])
  );
  console.log("Categorías creadas");

  const providers = await Promise.all(
    [
      { name: "Distribuidora Andina", contact: "Juan Carlos", phone: "0987654321" },
      { name: "Comercial El Mayorista", contact: "María López", phone: "0976543210" },
      { name: "Lácteos San Pedro", contact: "Pedro Sánchez", phone: "0965432109" },
    ].map((p) =>
      prisma.provider.upsert({
        where: { name: p.name },
        update: {},
        create: p,
      })
    )
  );

  const providersMap = Object.fromEntries(
    providers.map((p) => [p.name, p.id])
  );
  console.log("Proveedores creados");

  const clientes = await Promise.all(
    [
      { name: "Consumidor Final", docType: "DNI", docNumber: "00000000" },
      { name: "Juan Pérez", docType: "DNI", docNumber: "12345678", phone: "0981112233" },
      { name: "María González", docType: "DNI", docNumber: "87654321", phone: "0984455667" },
    ].map((c) =>
      prisma.client.upsert({
        where: { name: c.name },
        update: {},
        create: c,
      })
    )
  );
  console.log("Clientes creados");

  const productsData = [
    {
      code: "PROD-001", barcode: "775000000001", name: "Agua Mineral 500ml",
      categoryId: categoriesMap["Bebidas"], providerId: providersMap["Distribuidora Andina"],
      purchasePrice: 0.25, salePrice: 0.50, stock: 100, minStock: 10,
    },
    {
      code: "PROD-002", barcode: "775000000002", name: "Coca-Cola 1L",
      categoryId: categoriesMap["Bebidas"], providerId: providersMap["Distribuidora Andina"],
      purchasePrice: 0.80, salePrice: 1.25, stock: 80, minStock: 12,
    },
    {
      code: "PROD-003", barcode: "775000000003", name: "Arroz 1kg",
      categoryId: categoriesMap["Abarrotes"], providerId: providersMap["Comercial El Mayorista"],
      purchasePrice: 0.90, salePrice: 1.20, stock: 60, minStock: 15,
    },
    {
      code: "PROD-004", barcode: "775000000004", name: "Leche Entera 1L",
      categoryId: categoriesMap["Lácteos"], providerId: providersMap["Lácteos San Pedro"],
      purchasePrice: 0.75, salePrice: 1.10, stock: 50, minStock: 10,
    },
    {
      code: "PROD-005", barcode: "775000000005", name: "Detergente 1kg",
      categoryId: categoriesMap["Limpieza"], providerId: providersMap["Comercial El Mayorista"],
      purchasePrice: 1.50, salePrice: 2.25, stock: 40, minStock: 8,
    },
    {
      code: "PROD-006", barcode: "775000000006", name: "Papas Fritas 150g",
      categoryId: categoriesMap["Snacks"], providerId: providersMap["Distribuidora Andina"],
      purchasePrice: 0.60, salePrice: 1.00, stock: 70, minStock: 10,
    },
  ];

  for (const product of productsData) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product,
    });
  }
  console.log("Productos creados");

  await prisma.storeConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "Mi Tienda",
      ruc: "9999999999001",
      address: "Dirección principal",
      phone: "0999999999",
      email: "contacto@mitienda.com",
      currency: "USD",
      taxPercentage: 15,
    },
  });
  console.log("Configuración de tienda creada");

  console.log("Seed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
