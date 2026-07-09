import { PrismaClient, PaymentMethod, SaleStatus, PurchaseStatus, MovementType, CashRegisterStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(days: number, hour = 10, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d;
}

async function main() {
  console.log("Iniciando seed demo completo...");

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
    "reports:read", "reports:generate", "reports:download", "reports:delete",
    "users:manage", "settings:manage",
    "company:read", "company:update",
    "branches:create", "branches:read", "branches:update", "branches:delete",
    "taxes:create", "taxes:read", "taxes:update", "taxes:delete",
    "billing:read", "billing:update",
    "setup:initialize", "setup:read",
    "analytics:read",
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
    { roleId: roleMap.SUPERVISOR, names: ["products:read", "products:update", "sales:read", "purchases:read", "reports:read", "reports:generate", "reports:download", "branches:read", "company:read", "analytics:read", "cash:open", "cash:close"] },
  ];
  for (const rp of rolePerms) {
    await prisma.rolePermission.createMany({
      data: rp.names.map((n) => ({ roleId: rp.roleId, permissionId: permMap[n] })),
    });
  }
  console.log("Roles y permisos creados");

  // ─── 5. EMPRESA ──────────────────────────────────
  const company = await prisma.company.create({
    data: {
      legalName: "OmniStore Retail Solutions S.A.",
      commercialName: "OmniStore Pro",
      taxId: "900.452.123-0",
      email: "administracion@omnistore.com",
      phone: "0999999999",
      website: "https://www.omnistorepro.com",
      mainAddress: "Av. Principal 123, Quito",
      status: "ACTIVE",
    },
  });

  // ─── 6. CONFIGURACIÓN REGIONAL ────────────────
  await prisma.regionalConfig.create({
    data: {
      companyId: company.id,
      baseCurrency: "USD",
      timezone: "America/Guayaquil",
      dateFormat: "DD/MM/YYYY",
      decimalSeparator: ".",
      thousandSeparator: ",",
      language: "es",
      country: "Ecuador",
    },
  });
  console.log("Empresa y configuración regional creadas");

  // ─── 7. SUCURSALES ───────────────────────────────
  const mainBranch = await prisma.branch.create({
    data: {
      companyId: company.id,
      code: "SKL-UIO-01",
      name: "Sede Principal - Quito",
      address: "Av. Amazonas y Naciones Unidas",
      city: "Quito",
      country: "Ecuador",
      managerName: "Administrador Principal",
      phone: "0999999999",
      email: "sucursal@omnistore.com",
      status: "OPERATIVE",
      isMain: true,
    },
  });

  const secondaryBranch = await prisma.branch.create({
    data: {
      companyId: company.id,
      code: "SKL-GYE-01",
      name: "Sucursal Guayaquil",
      address: "Av. 9 de Octubre 456",
      city: "Guayaquil",
      country: "Ecuador",
      managerName: "Gerente Sucursal",
      phone: "0988888888",
      email: "guayaquil@omnistore.com",
      status: "OPERATIVE",
      isMain: false,
    },
  });
  console.log("Sucursales creadas");

  // ─── 8. IMPUESTOS ────────────────────────────────
  const ivaGeneral = await prisma.tax.create({
    data: { companyId: company.id, name: "IVA General", description: "Impuesto al valor agregado general", rate: 15, isDefault: true, isActive: true, appliesTo: "BOTH" },
  });
  await prisma.tax.create({
    data: { companyId: company.id, name: "IVA Reducido", description: "Impuesto reducido para productos seleccionados", rate: 5, isDefault: false, isActive: true, appliesTo: "BOTH" },
  });
  await prisma.tax.create({
    data: { companyId: company.id, name: "Exento", description: "Productos exentos de impuesto", rate: 0, isDefault: false, isActive: true, appliesTo: "BOTH" },
  });
  console.log("Impuestos creados");

  // ─── 9. CONFIGURACIÓN FACTURACIÓN ──────────────
  await prisma.billingConfig.create({
    data: { companyId: company.id, invoicePrefixDefault: "FAC", invoiceFooterText: "Gracias por su compra", includeTaxInPrice: false, autoGenerateInvoiceNumber: true, allowInvoiceWithoutResolution: true },
  });

  // ─── 10. RESOLUCIÓN FISCAL ──────────────────────
  const resolution = await prisma.invoiceResolution.create({
    data: {
      companyId: company.id,
      branchId: mainBranch.id,
      prefix: "FAC",
      startNumber: 1,
      endNumber: 10000,
      currentNumber: 0,
      authorizationCode: "AUTH-RES-001",
      validFrom: new Date("2026-01-01"),
      validUntil: new Date("2026-12-31"),
      status: "ACTIVE",
    },
  });
  console.log("Configuración de facturación y resolución fiscal creadas");

  // ─── 11. USUARIOS ────────────────────────────────
  const adminUser = await prisma.user.create({
    data: { name: "Administrador Principal", email: "admin@tienda.com", password: await bcrypt.hash("Admin123!", salt), roleId: roleMap.ADMINISTRADOR, companyId: company.id, branchId: mainBranch.id },
  });
  const cashierUser = await prisma.user.create({
    data: { name: "Cajero Principal", email: "cajero@tienda.com", password: await bcrypt.hash("Cajero123!", salt), roleId: roleMap.CAJERO, companyId: company.id, branchId: mainBranch.id },
  });
  const warehouseUser = await prisma.user.create({
    data: { name: "Bodeguero Principal", email: "bodega@tienda.com", password: await bcrypt.hash("Bodega123!", salt), roleId: roleMap.BODEGUERO, companyId: company.id, branchId: mainBranch.id },
  });
  const supervisorUser = await prisma.user.create({
    data: { name: "Supervisor Principal", email: "supervisor@tienda.com", password: await bcrypt.hash("Super123!", salt), roleId: roleMap.SUPERVISOR, companyId: company.id, branchId: mainBranch.id },
  });
  const userMap = { "admin@tienda.com": adminUser.id, "cajero@tienda.com": cashierUser.id, "bodega@tienda.com": warehouseUser.id, "supervisor@tienda.com": supervisorUser.id };

  // ─── 12. CATEGORÍAS ──────────────────────────────
  await prisma.category.createMany({
    data: [
      { name: "Bebidas", description: "Bebidas no alcohólicas", companyId: company.id },
      { name: "Abarrotes", description: "Productos de despensa", companyId: company.id },
      { name: "Limpieza", description: "Productos de limpieza y hogar", companyId: company.id },
      { name: "Lácteos", description: "Productos lácteos y derivados", companyId: company.id },
      { name: "Snacks", description: "Snacks, botanas y galletas", companyId: company.id },
      { name: "Cárnicos", description: "Embutidos y carnes frías", companyId: company.id },
      { name: "Panadería", description: "Pan y productos de panadería", companyId: company.id },
      { name: "Dulces y Golosinas", description: "Dulces, caramelos y golosinas", companyId: company.id },
    ],
  });
  const cats = await prisma.category.findMany();
  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  // ─── 13. PROVEEDORES ─────────────────────────────
  await prisma.provider.createMany({
    data: [
      { name: "Distribuidora Andina", contact: "Juan Carlos Mendoza", phone: "0987654321", email: "ventas@distribuidoraandina.com", address: "Av. Principal 123, Quito", companyId: company.id },
      { name: "Comercial El Mayorista", contact: "María López", phone: "0976543210", email: "ventas@elmayorista.com", address: "Calle Comercio 456, Guayaquil", companyId: company.id },
      { name: "Lácteos San Pedro", contact: "Pedro Sánchez", phone: "0965432109", email: "info@lacteossanpedro.com", address: "Av. Lechera 789, Cuenca", companyId: company.id },
      { name: "Cárnicos del Sur", contact: "Roberto Paredes", phone: "0954321098", email: "ventas@carnicosdelsur.com", address: "Av. Ganadera 321, Loja", companyId: company.id },
      { name: "Panificadora El Trigal", contact: "Luisa Martínez", phone: "0943210987", email: "contacto@eltrigal.com", address: "Calle del Pan 654, Ambato", companyId: company.id },
    ],
  });
  const provs = await prisma.provider.findMany();
  const provMap = Object.fromEntries(provs.map((p) => [p.name, p.id]));

  // ─── 14. CLIENTES ────────────────────────────────
  await prisma.client.createMany({
    data: [
      { name: "Consumidor Final", docType: "DNI", docNumber: "00000000", companyId: company.id },
      { name: "Juan Pérez", docType: "DNI", docNumber: "12345678", phone: "0981112233", email: "juan.perez@email.com", address: "Calle Los Olivos 123", companyId: company.id },
      { name: "María González", docType: "DNI", docNumber: "87654321", phone: "0984455667", email: "maria.gonzalez@email.com", address: "Av. Primavera 456", companyId: company.id },
      { name: "Carlos López", docType: "DNI", docNumber: "11223344", phone: "0991122334", email: "carlos.lopez@email.com", address: "Jr. Las Flores 789", companyId: company.id },
      { name: "Ana Martínez", docType: "DNI", docNumber: "22334455", phone: "0982233445", email: "ana.martinez@email.com", address: "Calle Sol 321", companyId: company.id },
      { name: "Pedro Ramírez", docType: "DNI", docNumber: "33445566", phone: "0973344556", email: "pedro.ramirez@email.com", address: "Av. Luna 654", companyId: company.id },
      { name: "Lucía Fernández", docType: "DNI", docNumber: "44556677", phone: "0964455667", email: "lucia.fernandez@email.com", address: "Calle Estrella 987", companyId: company.id },
      { name: "Miguel Torres", docType: "DNI", docNumber: "55667788", phone: "0955566778", email: "miguel.torres@email.com", address: "Jr. Nubes 147", companyId: company.id },
      { name: "Sofía Castillo", docType: "DNI", docNumber: "66778899", phone: "0946677889", email: "sofia.castillo@email.com", address: "Av. Río 258", companyId: company.id },
      { name: "Diego Herrera", docType: "DNI", docNumber: "77889900", phone: "0937788990", email: "diego.herrera@email.com", address: "Calle Monte 369", companyId: company.id },
    ],
  });
  const clients = await prisma.client.findMany();
  const clientMap = Object.fromEntries(clients.map((c) => [c.name, c.id]));

  // ─── 15. PRODUCTOS ───────────────────────────────
  const productsData = [
    { code: "PROD-001", name: "Agua Mineral 500ml", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.25, salePrice: 0.50, stock: 11, minStock: 20, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-002", name: "Coca-Cola 1L", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.80, salePrice: 1.25, stock: 9, minStock: 15, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-003", name: "Inca Kola 1L", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.80, salePrice: 1.25, stock: 5, minStock: 15, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-004", name: "Jugo Naranja 1L", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.60, salePrice: 1.00, stock: 10, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-005", name: "Arroz 1kg", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.90, salePrice: 1.20, stock: 27, minStock: 30, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-006", name: "Fideos Tallarín 500g", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.50, salePrice: 0.80, stock: 23, minStock: 20, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-007", name: "Azúcar 1kg", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.85, salePrice: 1.15, stock: 19, minStock: 20, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-008", name: "Aceite Vegetal 1L", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 1.20, salePrice: 1.80, stock: 13, minStock: 15, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-009", name: "Detergente 1kg", categoryId: catMap.Limpieza, providerId: provMap["Comercial El Mayorista"], purchasePrice: 1.50, salePrice: 2.25, stock: 12, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-010", name: "Desinfectante 1L", categoryId: catMap.Limpieza, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.90, salePrice: 1.50, stock: 10, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-011", name: "Leche Entera 1L", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 0.75, salePrice: 1.10, stock: 14, minStock: 20, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-012", name: "Yogurt Natural 1L", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 1.00, salePrice: 1.60, stock: 10, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-013", name: "Mantequilla 200g", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 0.60, salePrice: 1.00, stock: 8, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-014", name: "Queso Fresco 250g", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 1.20, salePrice: 1.80, stock: 7, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-015", name: "Papas Fritas 150g", categoryId: catMap.Snacks, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.60, salePrice: 1.00, stock: 19, minStock: 15, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-016", name: "Galletas Soda 200g", categoryId: catMap.Snacks, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.40, salePrice: 0.70, stock: 16, minStock: 15, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-017", name: "Jamón Cocido 250g", categoryId: catMap.Cárnicos, providerId: provMap["Cárnicos del Sur"], purchasePrice: 1.50, salePrice: 2.50, stock: 10, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-018", name: "Salchichas x6", categoryId: catMap.Cárnicos, providerId: provMap["Cárnicos del Sur"], purchasePrice: 1.00, salePrice: 1.80, stock: 13, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-019", name: "Pan Molde 600g", categoryId: catMap.Panadería, providerId: provMap["Panificadora El Trigal"], purchasePrice: 0.80, salePrice: 1.30, stock: 16, minStock: 10, taxId: ivaGeneral.id, companyId: company.id },
    { code: "PROD-020", name: "Caramelos surtidos 100g", categoryId: catMap["Dulces y Golosinas"], providerId: provMap["Distribuidora Andina"], purchasePrice: 0.30, salePrice: 0.50, stock: 22, minStock: 20, taxId: ivaGeneral.id, companyId: company.id },
  ];
  await prisma.product.createMany({ data: productsData });
  const prods = await prisma.product.findMany();
  const prodMap = Object.fromEntries(prods.map((p) => [p.code, p.id]));
  console.log("Productos creados con companyId y taxId");

  // ─── 16. COMPRAS ─────────────────────────────────
  const purchasesInput = [
    { series: "COMP", number: 1, providerId: provMap["Distribuidora Andina"], userId: userMap["bodega@tienda.com"],
      subtotal: 31.00, tax: 4.65, total: 35.65, createdAt: daysAgo(30, 8, 15),
      details: [
        { productId: prodMap["PROD-001"], quantity: 20, unitCost: 0.25, subtotal: 5.00 },
        { productId: prodMap["PROD-002"], quantity: 15, unitCost: 0.80, subtotal: 12.00 },
        { productId: prodMap["PROD-003"], quantity: 10, unitCost: 0.80, subtotal: 8.00 },
        { productId: prodMap["PROD-004"], quantity: 10, unitCost: 0.60, subtotal: 6.00 },
      ] },
    { series: "COMP", number: 2, providerId: provMap["Comercial El Mayorista"], userId: userMap["bodega@tienda.com"],
      subtotal: 74.50, tax: 11.175, total: 85.68, createdAt: daysAgo(27, 9, 0),
      details: [
        { productId: prodMap["PROD-005"], quantity: 30, unitCost: 0.90, subtotal: 27.00 },
        { productId: prodMap["PROD-006"], quantity: 25, unitCost: 0.50, subtotal: 12.50 },
        { productId: prodMap["PROD-007"], quantity: 20, unitCost: 0.85, subtotal: 17.00 },
        { productId: prodMap["PROD-008"], quantity: 15, unitCost: 1.20, subtotal: 18.00 },
      ] },
    { series: "COMP", number: 3, providerId: provMap["Lácteos San Pedro"], userId: userMap["bodega@tienda.com"],
      subtotal: 42.60, tax: 6.39, total: 48.99, createdAt: daysAgo(24, 7, 45),
      details: [
        { productId: prodMap["PROD-011"], quantity: 20, unitCost: 0.75, subtotal: 15.00 },
        { productId: prodMap["PROD-012"], quantity: 12, unitCost: 1.00, subtotal: 12.00 },
        { productId: prodMap["PROD-013"], quantity: 10, unitCost: 0.60, subtotal: 6.00 },
        { productId: prodMap["PROD-014"], quantity: 8, unitCost: 1.20, subtotal: 9.60 },
      ] },
    { series: "COMP", number: 4, providerId: provMap["Distribuidora Andina"], userId: userMap["bodega@tienda.com"],
      subtotal: 32.00, tax: 4.80, total: 36.80, createdAt: daysAgo(20, 10, 30),
      details: [
        { productId: prodMap["PROD-015"], quantity: 25, unitCost: 0.60, subtotal: 15.00 },
        { productId: prodMap["PROD-016"], quantity: 20, unitCost: 0.40, subtotal: 8.00 },
        { productId: prodMap["PROD-020"], quantity: 30, unitCost: 0.30, subtotal: 9.00 },
      ] },
    { series: "COMP", number: 5, providerId: provMap["Comercial El Mayorista"], userId: userMap["bodega@tienda.com"],
      subtotal: 33.30, tax: 4.995, total: 38.30, createdAt: daysAgo(16, 8, 0),
      details: [
        { productId: prodMap["PROD-009"], quantity: 15, unitCost: 1.50, subtotal: 22.50 },
        { productId: prodMap["PROD-010"], quantity: 12, unitCost: 0.90, subtotal: 10.80 },
      ] },
    { series: "COMP", number: 6, providerId: provMap["Cárnicos del Sur"], userId: userMap["bodega@tienda.com"],
      subtotal: 33.00, tax: 4.95, total: 37.95, createdAt: daysAgo(12, 9, 15),
      details: [
        { productId: prodMap["PROD-017"], quantity: 12, unitCost: 1.50, subtotal: 18.00 },
        { productId: prodMap["PROD-018"], quantity: 15, unitCost: 1.00, subtotal: 15.00 },
      ] },
    { series: "COMP", number: 7, providerId: provMap["Panificadora El Trigal"], userId: userMap["bodega@tienda.com"],
      subtotal: 16.00, tax: 2.40, total: 18.40, createdAt: daysAgo(8, 11, 0),
      details: [{ productId: prodMap["PROD-019"], quantity: 20, unitCost: 0.80, subtotal: 16.00 }] },
  ];

  const stockTracker: Record<number, number> = {};
  for (const p of prods) stockTracker[p.id] = 0;

  for (const pi of purchasesInput) {
    await prisma.purchase.create({
      data: {
        companyId: company.id,
        branchId: mainBranch.id,
        userId: pi.userId,
        series: pi.series, number: pi.number, providerId: pi.providerId,
        subtotal: pi.subtotal, tax: pi.tax, taxTotal: pi.tax, total: pi.total,
        status: PurchaseStatus.COMPLETADA, createdAt: pi.createdAt,
        details: { create: pi.details.map((d) => ({ ...d, companyId: company.id, branchId: mainBranch.id })) },
      },
    });
    for (const d of pi.details) {
      stockTracker[d.productId] += d.quantity;
    }
  }

  // Update product stocks
  for (const p of prods) {
    await prisma.product.update({ where: { id: p.id }, data: { stock: stockTracker[p.id] } });
  }
  console.log("Compras creadas");

  // ─── 17. VENTAS ───────────────────────────────────
  const salesInput = [
    { series: "VENT", number: 1, clientId: clientMap["Juan Pérez"], userId: userMap["cajero@tienda.com"],
      subtotal: 5.00, discount: 0, tax: 0.75, total: 5.75, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(26, 10, 30),
      details: [
        { productId: prodMap["PROD-001"], quantity: 3, unitPrice: 0.50, discount: 0, subtotal: 1.50, taxRate: 15, taxAmount: 0.225, totalLine: 1.725 },
        { productId: prodMap["PROD-002"], quantity: 2, unitPrice: 1.25, discount: 0, subtotal: 2.50, taxRate: 15, taxAmount: 0.375, totalLine: 2.875 },
        { productId: prodMap["PROD-015"], quantity: 1, unitPrice: 1.00, discount: 0, subtotal: 1.00, taxRate: 15, taxAmount: 0.15, totalLine: 1.15 },
      ] },
    { series: "VENT", number: 2, clientId: clientMap["María González"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.60, discount: 0.50, tax: 0.92, total: 7.02, paymentMethod: PaymentMethod.TARJETA, createdAt: daysAgo(23, 11, 45),
      details: [
        { productId: prodMap["PROD-005"], quantity: 2, unitPrice: 1.20, discount: 0, subtotal: 2.40, taxRate: 15, taxAmount: 0.36, totalLine: 2.76 },
        { productId: prodMap["PROD-008"], quantity: 1, unitPrice: 1.80, discount: 0, subtotal: 1.80, taxRate: 15, taxAmount: 0.27, totalLine: 2.07 },
        { productId: prodMap["PROD-011"], quantity: 1, unitPrice: 1.10, discount: 0, subtotal: 1.10, taxRate: 15, taxAmount: 0.165, totalLine: 1.265 },
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30, taxRate: 15, taxAmount: 0.195, totalLine: 1.495 },
      ] },
    { series: "VENT", number: 3, clientId: clientMap["Consumidor Final"], userId: userMap["cajero@tienda.com"],
      subtotal: 3.75, discount: 0, tax: 0.56, total: 4.31, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(21, 15, 20),
      details: [
        { productId: prodMap["PROD-009"], quantity: 1, unitPrice: 2.25, discount: 0, subtotal: 2.25, taxRate: 15, taxAmount: 0.338, totalLine: 2.588 },
        { productId: prodMap["PROD-010"], quantity: 1, unitPrice: 1.50, discount: 0, subtotal: 1.50, taxRate: 15, taxAmount: 0.225, totalLine: 1.725 },
      ] },
    { series: "VENT", number: 4, clientId: clientMap["Carlos López"], userId: userMap["cajero@tienda.com"],
      subtotal: 11.00, discount: 0, tax: 1.65, total: 12.65, paymentMethod: PaymentMethod.TRANSFERENCIA, createdAt: daysAgo(19, 12, 10),
      details: [
        { productId: prodMap["PROD-002"], quantity: 4, unitPrice: 1.25, discount: 0, subtotal: 5.00, taxRate: 15, taxAmount: 0.75, totalLine: 5.75 },
        { productId: prodMap["PROD-003"], quantity: 2, unitPrice: 1.25, discount: 0, subtotal: 2.50, taxRate: 15, taxAmount: 0.375, totalLine: 2.875 },
        { productId: prodMap["PROD-015"], quantity: 2, unitPrice: 1.00, discount: 0, subtotal: 2.00, taxRate: 15, taxAmount: 0.30, totalLine: 2.30 },
        { productId: prodMap["PROD-020"], quantity: 3, unitPrice: 0.50, discount: 0, subtotal: 1.50, taxRate: 15, taxAmount: 0.225, totalLine: 1.725 },
      ] },
    { series: "VENT", number: 5, clientId: clientMap["Ana Martínez"], userId: userMap["cajero@tienda.com"],
      subtotal: 7.40, discount: 0, tax: 1.11, total: 8.51, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(17, 9, 30),
      details: [
        { productId: prodMap["PROD-017"], quantity: 1, unitPrice: 2.50, discount: 0, subtotal: 2.50, taxRate: 15, taxAmount: 0.375, totalLine: 2.875 },
        { productId: prodMap["PROD-018"], quantity: 2, unitPrice: 1.80, discount: 0, subtotal: 3.60, taxRate: 15, taxAmount: 0.54, totalLine: 4.14 },
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30, taxRate: 15, taxAmount: 0.195, totalLine: 1.495 },
      ] },
    { series: "VENT", number: 6, clientId: clientMap["Pedro Ramírez"], userId: userMap["cajero@tienda.com"],
      subtotal: 4.80, discount: 0, tax: 0.72, total: 5.52, paymentMethod: PaymentMethod.QR, createdAt: daysAgo(14, 17, 0),
      details: [
        { productId: prodMap["PROD-011"], quantity: 2, unitPrice: 1.10, discount: 0, subtotal: 2.20, taxRate: 15, taxAmount: 0.33, totalLine: 2.53 },
        { productId: prodMap["PROD-012"], quantity: 1, unitPrice: 1.60, discount: 0, subtotal: 1.60, taxRate: 15, taxAmount: 0.24, totalLine: 1.84 },
        { productId: prodMap["PROD-013"], quantity: 1, unitPrice: 1.00, discount: 0, subtotal: 1.00, taxRate: 15, taxAmount: 0.15, totalLine: 1.15 },
      ] },
    { series: "VENT", number: 7, clientId: clientMap["Lucía Fernández"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.10, discount: 1.00, tax: 0.77, total: 5.87, paymentMethod: PaymentMethod.TARJETA, createdAt: daysAgo(11, 14, 15),
      details: [
        { productId: prodMap["PROD-001"], quantity: 6, unitPrice: 0.50, discount: 1.00, subtotal: 3.00, taxRate: 15, taxAmount: 0.45, totalLine: 3.45 },
        { productId: prodMap["PROD-016"], quantity: 3, unitPrice: 0.70, discount: 0, subtotal: 2.10, taxRate: 15, taxAmount: 0.315, totalLine: 2.415 },
        { productId: prodMap["PROD-020"], quantity: 2, unitPrice: 0.50, discount: 0, subtotal: 1.00, taxRate: 15, taxAmount: 0.15, totalLine: 1.15 },
      ] },
    { series: "VENT", number: 8, clientId: clientMap["Miguel Torres"], userId: userMap["cajero@tienda.com"],
      subtotal: 5.75, discount: 0, tax: 0.86, total: 6.61, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(9, 11, 0),
      details: [
        { productId: prodMap["PROD-005"], quantity: 1, unitPrice: 1.20, discount: 0, subtotal: 1.20, taxRate: 15, taxAmount: 0.18, totalLine: 1.38 },
        { productId: prodMap["PROD-006"], quantity: 2, unitPrice: 0.80, discount: 0, subtotal: 1.60, taxRate: 15, taxAmount: 0.24, totalLine: 1.84 },
        { productId: prodMap["PROD-007"], quantity: 1, unitPrice: 1.15, discount: 0, subtotal: 1.15, taxRate: 15, taxAmount: 0.173, totalLine: 1.323 },
        { productId: prodMap["PROD-008"], quantity: 1, unitPrice: 1.80, discount: 0, subtotal: 1.80, taxRate: 15, taxAmount: 0.27, totalLine: 2.07 },
      ] },
    { series: "VENT", number: 9, clientId: clientMap["Sofía Castillo"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.00, discount: 0, tax: 0.90, total: 6.90, paymentMethod: PaymentMethod.TRANSFERENCIA, createdAt: daysAgo(7, 16, 30),
      details: [
        { productId: prodMap["PROD-009"], quantity: 2, unitPrice: 2.25, discount: 0, subtotal: 4.50, taxRate: 15, taxAmount: 0.675, totalLine: 5.175 },
        { productId: prodMap["PROD-010"], quantity: 1, unitPrice: 1.50, discount: 0, subtotal: 1.50, taxRate: 15, taxAmount: 0.225, totalLine: 1.725 },
      ] },
    { series: "VENT", number: 10, clientId: clientMap["Diego Herrera"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.40, discount: 0, tax: 0.96, total: 7.36, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(5, 12, 45),
      details: [
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30, taxRate: 15, taxAmount: 0.195, totalLine: 1.495 },
        { productId: prodMap["PROD-017"], quantity: 1, unitPrice: 2.50, discount: 0, subtotal: 2.50, taxRate: 15, taxAmount: 0.375, totalLine: 2.875 },
        { productId: prodMap["PROD-012"], quantity: 1, unitPrice: 1.60, discount: 0, subtotal: 1.60, taxRate: 15, taxAmount: 0.24, totalLine: 1.84 },
        { productId: prodMap["PROD-020"], quantity: 2, unitPrice: 0.50, discount: 0, subtotal: 1.00, taxRate: 15, taxAmount: 0.15, totalLine: 1.15 },
      ] },
    { series: "VENT", number: 11, clientId: clientMap["Juan Pérez"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.45, discount: 0, tax: 0.97, total: 7.42, paymentMethod: PaymentMethod.TARJETA, createdAt: daysAgo(3, 18, 20),
      details: [
        { productId: prodMap["PROD-003"], quantity: 3, unitPrice: 1.25, discount: 0, subtotal: 3.75, taxRate: 15, taxAmount: 0.563, totalLine: 4.313 },
        { productId: prodMap["PROD-015"], quantity: 2, unitPrice: 1.00, discount: 0, subtotal: 2.00, taxRate: 15, taxAmount: 0.30, totalLine: 2.30 },
        { productId: prodMap["PROD-016"], quantity: 1, unitPrice: 0.70, discount: 0, subtotal: 0.70, taxRate: 15, taxAmount: 0.105, totalLine: 0.805 },
      ] },
    { series: "VENT", number: 12, clientId: clientMap["María González"], userId: userMap["cajero@tienda.com"],
      subtotal: 7.90, discount: 0.50, tax: 1.11, total: 8.51, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(1, 10, 15),
      details: [
        { productId: prodMap["PROD-011"], quantity: 3, unitPrice: 1.10, discount: 0, subtotal: 3.30, taxRate: 15, taxAmount: 0.495, totalLine: 3.795 },
        { productId: prodMap["PROD-014"], quantity: 1, unitPrice: 1.80, discount: 0, subtotal: 1.80, taxRate: 15, taxAmount: 0.27, totalLine: 2.07 },
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30, taxRate: 15, taxAmount: 0.195, totalLine: 1.495 },
        { productId: prodMap["PROD-013"], quantity: 1, unitPrice: 1.00, discount: 0, subtotal: 1.00, taxRate: 15, taxAmount: 0.15, totalLine: 1.15 },
        { productId: prodMap["PROD-020"], quantity: 1, unitPrice: 0.50, discount: 0, subtotal: 0.50, taxRate: 15, taxAmount: 0.075, totalLine: 0.575 },
      ] },
  ];

  for (const si of salesInput) {
    await prisma.sale.create({
      data: {
        companyId: company.id,
        branchId: mainBranch.id,
        series: si.series, number: si.number, clientId: si.clientId,
        userId: si.userId, subtotal: si.subtotal, discount: si.discount,
        tax: si.tax, taxTotal: si.tax, total: si.total,
        paymentMethod: si.paymentMethod, status: SaleStatus.COMPLETADA, createdAt: si.createdAt,
        invoicePrefix: resolution.prefix,
        invoiceResolutionId: resolution.id,
        invoiceNumber: `${resolution.prefix}-${String(si.number).padStart(8, "0")}`,
        details: { create: si.details.map((d) => ({ ...d, taxId: ivaGeneral.id, companyId: company.id, branchId: mainBranch.id })) },
      },
    });
  }

  // Update resolution currentNumber
  await prisma.invoiceResolution.update({ where: { id: resolution.id }, data: { currentNumber: salesInput.length } });
  console.log("Ventas creadas con facturación");

  // ─── 18. MOVIMIENTOS Y CAJA ──────────────────────
  const cr1 = await prisma.cashRegister.create({
    data: {
      userId: userMap["cajero@tienda.com"], companyId: company.id, branchId: mainBranch.id,
      openingDate: daysAgo(26, 8, 0), closingDate: daysAgo(10, 20, 0),
      initialAmount: 100, totalSales: 49.63, totalExpenses: 0,
      expectedTotal: 149.63, actualTotal: 150, difference: 0.37,
      observations: "Cierre parcial", status: CashRegisterStatus.CERRADA,
    },
  });
  await prisma.cashMovement.createMany({
    data: [
      { cashRegisterId: cr1.id, companyId: company.id, branchId: mainBranch.id, type: "INGRESO", amount: 5.75, description: "Venta VENT-0001", createdAt: daysAgo(26, 10, 30) },
      { cashRegisterId: cr1.id, companyId: company.id, branchId: mainBranch.id, type: "INGRESO", amount: 7.02, description: "Venta VENT-0002", createdAt: daysAgo(23, 11, 45) },
      { cashRegisterId: cr1.id, companyId: company.id, branchId: mainBranch.id, type: "INGRESO", amount: 4.31, description: "Venta VENT-0003", createdAt: daysAgo(21, 15, 20) },
      { cashRegisterId: cr1.id, companyId: company.id, branchId: mainBranch.id, type: "INGRESO", amount: 12.65, description: "Venta VENT-0004", createdAt: daysAgo(19, 12, 10) },
      { cashRegisterId: cr1.id, companyId: company.id, branchId: mainBranch.id, type: "INGRESO", amount: 8.51, description: "Venta VENT-0005", createdAt: daysAgo(17, 9, 30) },
      { cashRegisterId: cr1.id, companyId: company.id, branchId: mainBranch.id, type: "INGRESO", amount: 5.52, description: "Venta VENT-0006", createdAt: daysAgo(14, 17, 0) },
      { cashRegisterId: cr1.id, companyId: company.id, branchId: mainBranch.id, type: "INGRESO", amount: 5.87, description: "Venta VENT-0007", createdAt: daysAgo(11, 14, 15) },
    ],
  });
  console.log("Caja registradora creada");

  console.log("\n✅ Seed DEMO completado exitosamente!");
}

main()
  .catch((e) => { console.error("Error en seed demo:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });