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
  console.log("Iniciando seed completo...");

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
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.storeConfig.deleteMany();
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
    ],
  });
  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  // ─── 4. ROLES × PERMISOS ────────────────────────
  const rolePerms = [
    { roleId: roleMap.ADMINISTRADOR, names: permNames },
    { roleId: roleMap.CAJERO, names: ["products:read", "sales:create", "sales:read", "cash:open", "cash:close"] },
    { roleId: roleMap.BODEGUERO, names: ["products:create", "products:read", "products:update", "purchases:create", "purchases:read", "inventory:adjust"] },
  ];
  for (const rp of rolePerms) {
    await prisma.rolePermission.createMany({
      data: rp.names.map((n) => ({ roleId: rp.roleId, permissionId: permMap[n] })),
    });
  }
  console.log("Roles y permisos creados");

  // ─── 5. USUARIOS ────────────────────────────────
  await prisma.user.createMany({
    data: [
      { name: "Administrador Principal", email: "admin@tienda.com", password: await bcrypt.hash("Admin123!", salt), roleId: roleMap.ADMINISTRADOR },
      { name: "Cajero Principal", email: "cajero@tienda.com", password: await bcrypt.hash("Cajero123!", salt), roleId: roleMap.CAJERO },
      { name: "Bodeguero Principal", email: "bodega@tienda.com", password: await bcrypt.hash("Bodega123!", salt), roleId: roleMap.BODEGUERO },
    ],
  });
  const users = await prisma.user.findMany();
  const userMap = Object.fromEntries(users.map((u) => [u.email, u.id]));
  console.log("Usuarios creados");

  // ─── 6. CATEGORÍAS ──────────────────────────────
  await prisma.category.createMany({
    data: [
      { name: "Bebidas", description: "Bebidas no alcohólicas" },
      { name: "Abarrotes", description: "Productos de despensa" },
      { name: "Limpieza", description: "Productos de limpieza y hogar" },
      { name: "Lácteos", description: "Productos lácteos y derivados" },
      { name: "Snacks", description: "Snacks, botanas y galletas" },
      { name: "Cárnicos", description: "Embutidos y carnes frías" },
      { name: "Panadería", description: "Pan y productos de panadería" },
      { name: "Dulces y Golosinas", description: "Dulces, caramelos y golosinas" },
    ],
  });
  const cats = await prisma.category.findMany();
  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  // ─── 7. PROVEEDORES ─────────────────────────────
  await prisma.provider.createMany({
    data: [
      { name: "Distribuidora Andina", contact: "Juan Carlos Mendoza", phone: "0987654321", email: "ventas@distribuidoraandina.com", address: "Av. Principal 123, Quito" },
      { name: "Comercial El Mayorista", contact: "María López", phone: "0976543210", email: "ventas@elmayorista.com", address: "Calle Comercio 456, Guayaquil" },
      { name: "Lácteos San Pedro", contact: "Pedro Sánchez", phone: "0965432109", email: "info@lacteossanpedro.com", address: "Av. Lechera 789, Cuenca" },
      { name: "Cárnicos del Sur", contact: "Roberto Paredes", phone: "0954321098", email: "ventas@carnicosdelsur.com", address: "Av. Ganadera 321, Loja" },
      { name: "Panificadora El Trigal", contact: "Luisa Martínez", phone: "0943210987", email: "contacto@eltrigal.com", address: "Calle del Pan 654, Ambato" },
    ],
  });
  const provs = await prisma.provider.findMany();
  const provMap = Object.fromEntries(provs.map((p) => [p.name, p.id]));

  // ─── 8. CLIENTES ────────────────────────────────
  await prisma.client.createMany({
    data: [
      { name: "Consumidor Final", docType: "DNI", docNumber: "00000000" },
      { name: "Juan Pérez", docType: "DNI", docNumber: "12345678", phone: "0981112233", email: "juan.perez@email.com", address: "Calle Los Olivos 123" },
      { name: "María González", docType: "DNI", docNumber: "87654321", phone: "0984455667", email: "maria.gonzalez@email.com", address: "Av. Primavera 456" },
      { name: "Carlos López", docType: "DNI", docNumber: "11223344", phone: "0991122334", email: "carlos.lopez@email.com", address: "Jr. Las Flores 789" },
      { name: "Ana Martínez", docType: "DNI", docNumber: "22334455", phone: "0982233445", email: "ana.martinez@email.com", address: "Calle Sol 321" },
      { name: "Pedro Ramírez", docType: "DNI", docNumber: "33445566", phone: "0973344556", email: "pedro.ramirez@email.com", address: "Av. Luna 654" },
      { name: "Lucía Fernández", docType: "DNI", docNumber: "44556677", phone: "0964455667", email: "lucia.fernandez@email.com", address: "Calle Estrella 987" },
      { name: "Miguel Torres", docType: "DNI", docNumber: "55667788", phone: "0955566778", email: "miguel.torres@email.com", address: "Jr. Nubes 147" },
      { name: "Sofía Castillo", docType: "DNI", docNumber: "66778899", phone: "0946677889", email: "sofia.castillo@email.com", address: "Av. Río 258" },
      { name: "Diego Herrera", docType: "DNI", docNumber: "77889900", phone: "0937788990", email: "diego.herrera@email.com", address: "Calle Monte 369" },
    ],
  });
  const clients = await prisma.client.findMany();
  const clientMap = Object.fromEntries(clients.map((c) => [c.name, c.id]));
  console.log("Clientes, categorías y proveedores creados");

  // ─── 9. PRODUCTOS ───────────────────────────────
  const productsData = [
    { code: "PROD-001", barcode: "7750101000001", name: "Agua Mineral 500ml", description: "Agua mineral natural sin gas 500ml", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.25, salePrice: 0.50, stock: 11, minStock: 20 },
    { code: "PROD-002", barcode: "7750101000002", name: "Coca-Cola 1L", description: "Bebida gaseosa Coca-Cola 1 litro", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.80, salePrice: 1.25, stock: 9, minStock: 15 },
    { code: "PROD-003", barcode: "7750101000003", name: "Inca Kola 1L", description: "Bebida gaseosa Inca Kola 1 litro", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.80, salePrice: 1.25, stock: 5, minStock: 15 },
    { code: "PROD-004", barcode: "7750101000004", name: "Jugo Naranja 1L", description: "Jugo de naranja natural 1 litro", categoryId: catMap.Bebidas, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.60, salePrice: 1.00, stock: 10, minStock: 10 },
    { code: "PROD-005", barcode: "7750101000005", name: "Arroz 1kg", description: "Arroz blanco premium 1kg", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.90, salePrice: 1.20, stock: 27, minStock: 30 },
    { code: "PROD-006", barcode: "7750101000006", name: "Fideos Tallarín 500g", description: "Fideos tipo tallarín 500g", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.50, salePrice: 0.80, stock: 23, minStock: 20 },
    { code: "PROD-007", barcode: "7750101000007", name: "Azúcar 1kg", description: "Azúcar blanca refinada 1kg", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.85, salePrice: 1.15, stock: 19, minStock: 20 },
    { code: "PROD-008", barcode: "7750101000008", name: "Aceite Vegetal 1L", description: "Aceite vegetal 1 litro", categoryId: catMap.Abarrotes, providerId: provMap["Comercial El Mayorista"], purchasePrice: 1.20, salePrice: 1.80, stock: 13, minStock: 15 },
    { code: "PROD-009", barcode: "7750101000009", name: "Detergente 1kg", description: "Detergente en polvo 1kg", categoryId: catMap.Limpieza, providerId: provMap["Comercial El Mayorista"], purchasePrice: 1.50, salePrice: 2.25, stock: 12, minStock: 10 },
    { code: "PROD-010", barcode: "7750101000010", name: "Desinfectante 1L", description: "Desinfectante líquido 1 litro", categoryId: catMap.Limpieza, providerId: provMap["Comercial El Mayorista"], purchasePrice: 0.90, salePrice: 1.50, stock: 10, minStock: 10 },
    { code: "PROD-011", barcode: "7750101000011", name: "Leche Entera 1L", description: "Leche entera pasteurizada 1 litro", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 0.75, salePrice: 1.10, stock: 14, minStock: 20 },
    { code: "PROD-012", barcode: "7750101000012", name: "Yogurt Natural 1L", description: "Yogurt natural cremoso 1 litro", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 1.00, salePrice: 1.60, stock: 10, minStock: 10 },
    { code: "PROD-013", barcode: "7750101000013", name: "Mantequilla 200g", description: "Mantequilla pasteurizada 200g", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 0.60, salePrice: 1.00, stock: 8, minStock: 10 },
    { code: "PROD-014", barcode: "7750101000014", name: "Queso Fresco 250g", description: "Queso fresco natural 250g", categoryId: catMap.Lácteos, providerId: provMap["Lácteos San Pedro"], purchasePrice: 1.20, salePrice: 1.80, stock: 7, minStock: 10 },
    { code: "PROD-015", barcode: "7750101000015", name: "Papas Fritas 150g", description: "Papas fritas sabor natural 150g", categoryId: catMap.Snacks, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.60, salePrice: 1.00, stock: 19, minStock: 15 },
    { code: "PROD-016", barcode: "7750101000016", name: "Galletas Soda 200g", description: "Galletas tipo soda 200g", categoryId: catMap.Snacks, providerId: provMap["Distribuidora Andina"], purchasePrice: 0.40, salePrice: 0.70, stock: 16, minStock: 15 },
    { code: "PROD-017", barcode: "7750101000017", name: "Jamón Cocido 250g", description: "Jamón cocido tajado 250g", categoryId: catMap.Cárnicos, providerId: provMap["Cárnicos del Sur"], purchasePrice: 1.50, salePrice: 2.50, stock: 10, minStock: 10 },
    { code: "PROD-018", barcode: "7750101000018", name: "Salchichas x6", description: "Salchichas de pollo paquete x6", categoryId: catMap.Cárnicos, providerId: provMap["Cárnicos del Sur"], purchasePrice: 1.00, salePrice: 1.80, stock: 13, minStock: 10 },
    { code: "PROD-019", barcode: "7750101000019", name: "Pan Molde 600g", description: "Pan de molde blanco 600g", categoryId: catMap.Panadería, providerId: provMap["Panificadora El Trigal"], purchasePrice: 0.80, salePrice: 1.30, stock: 16, minStock: 10 },
    { code: "PROD-020", barcode: "7750101000020", name: "Caramelos surtidos 100g", description: "Caramelos surtidos sabor fruta 100g", categoryId: catMap["Dulces y Golosinas"], providerId: provMap["Distribuidora Andina"], purchasePrice: 0.30, salePrice: 0.50, stock: 22, minStock: 20 },
  ];
  await prisma.product.createMany({ data: productsData });
  const prods = await prisma.product.findMany();
  const prodMap = Object.fromEntries(prods.map((p) => [p.code, p.id]));
  console.log("Productos creados");

  // ═══════════════════════════════════════════════
  // FLUJO DE COMPRAS (7 compras con 23 detalles)
  // ═══════════════════════════════════════════════

  interface PurchaseInput {
    series: string; number: number; providerId: number; userId: number;
    subtotal: number; tax: number; total: number; createdAt: Date;
    details: { productId: number; quantity: number; unitCost: number; subtotal: number }[];
  }

  const purchasesInput: PurchaseInput[] = [
    {
      series: "COMP", number: 1, providerId: provMap["Distribuidora Andina"], userId: userMap["bodega@tienda.com"],
      subtotal: 31.00, tax: 4.65, total: 35.65, createdAt: daysAgo(30, 8, 15),
      details: [
        { productId: prodMap["PROD-001"], quantity: 20, unitCost: 0.25, subtotal: 5.00 },
        { productId: prodMap["PROD-002"], quantity: 15, unitCost: 0.80, subtotal: 12.00 },
        { productId: prodMap["PROD-003"], quantity: 10, unitCost: 0.80, subtotal: 8.00 },
        { productId: prodMap["PROD-004"], quantity: 10, unitCost: 0.60, subtotal: 6.00 },
      ],
    },
    {
      series: "COMP", number: 2, providerId: provMap["Comercial El Mayorista"], userId: userMap["bodega@tienda.com"],
      subtotal: 74.50, tax: 11.175, total: 85.68, createdAt: daysAgo(27, 9, 0),
      details: [
        { productId: prodMap["PROD-005"], quantity: 30, unitCost: 0.90, subtotal: 27.00 },
        { productId: prodMap["PROD-006"], quantity: 25, unitCost: 0.50, subtotal: 12.50 },
        { productId: prodMap["PROD-007"], quantity: 20, unitCost: 0.85, subtotal: 17.00 },
        { productId: prodMap["PROD-008"], quantity: 15, unitCost: 1.20, subtotal: 18.00 },
      ],
    },
    {
      series: "COMP", number: 3, providerId: provMap["Lácteos San Pedro"], userId: userMap["bodega@tienda.com"],
      subtotal: 42.60, tax: 6.39, total: 48.99, createdAt: daysAgo(24, 7, 45),
      details: [
        { productId: prodMap["PROD-011"], quantity: 20, unitCost: 0.75, subtotal: 15.00 },
        { productId: prodMap["PROD-012"], quantity: 12, unitCost: 1.00, subtotal: 12.00 },
        { productId: prodMap["PROD-013"], quantity: 10, unitCost: 0.60, subtotal: 6.00 },
        { productId: prodMap["PROD-014"], quantity: 8, unitCost: 1.20, subtotal: 9.60 },
      ],
    },
    {
      series: "COMP", number: 4, providerId: provMap["Distribuidora Andina"], userId: userMap["bodega@tienda.com"],
      subtotal: 32.00, tax: 4.80, total: 36.80, createdAt: daysAgo(20, 10, 30),
      details: [
        { productId: prodMap["PROD-015"], quantity: 25, unitCost: 0.60, subtotal: 15.00 },
        { productId: prodMap["PROD-016"], quantity: 20, unitCost: 0.40, subtotal: 8.00 },
        { productId: prodMap["PROD-020"], quantity: 30, unitCost: 0.30, subtotal: 9.00 },
      ],
    },
    {
      series: "COMP", number: 5, providerId: provMap["Comercial El Mayorista"], userId: userMap["bodega@tienda.com"],
      subtotal: 33.30, tax: 4.995, total: 38.30, createdAt: daysAgo(16, 8, 0),
      details: [
        { productId: prodMap["PROD-009"], quantity: 15, unitCost: 1.50, subtotal: 22.50 },
        { productId: prodMap["PROD-010"], quantity: 12, unitCost: 0.90, subtotal: 10.80 },
      ],
    },
    {
      series: "COMP", number: 6, providerId: provMap["Cárnicos del Sur"], userId: userMap["bodega@tienda.com"],
      subtotal: 33.00, tax: 4.95, total: 37.95, createdAt: daysAgo(12, 9, 15),
      details: [
        { productId: prodMap["PROD-017"], quantity: 12, unitCost: 1.50, subtotal: 18.00 },
        { productId: prodMap["PROD-018"], quantity: 15, unitCost: 1.00, subtotal: 15.00 },
      ],
    },
    {
      series: "COMP", number: 7, providerId: provMap["Panificadora El Trigal"], userId: userMap["bodega@tienda.com"],
      subtotal: 16.00, tax: 2.40, total: 18.40, createdAt: daysAgo(8, 11, 0),
      details: [
        { productId: prodMap["PROD-019"], quantity: 20, unitCost: 0.80, subtotal: 16.00 },
      ],
    },
  ];

  // Track cumulative stock per product for inventory movements
  const stockTracker: Record<number, number> = {};
  for (const p of prods) stockTracker[p.id] = 0;

  const allMovements: {
    productId: number; userId: number; type: MovementType;
    quantity: number; stockBefore: number; stockAfter: number;
    reference: string; referenceId: number | null; createdAt: Date;
  }[] = [];

  for (const pi of purchasesInput) {
    const purchase = await prisma.purchase.create({
      data: {
        series: pi.series, number: pi.number, providerId: pi.providerId,
        userId: pi.userId, subtotal: pi.subtotal, tax: pi.tax, total: pi.total,
        status: PurchaseStatus.COMPLETADA, createdAt: pi.createdAt,
        details: { create: pi.details },
      },
    });

    for (const d of pi.details) {
      const before = stockTracker[d.productId];
      const after = before + d.quantity;
      stockTracker[d.productId] = after;
      allMovements.push({
        productId: d.productId, userId: pi.userId, type: MovementType.PURCHASE_IN,
        quantity: d.quantity, stockBefore: before, stockAfter: after,
        reference: "purchase", referenceId: purchase.id, createdAt: pi.createdAt,
      });
    }
  }
  console.log("Compras creadas");

  // ═══════════════════════════════════════════════
  // FLUJO DE VENTAS (12 ventas con 33 detalles)
  // ═══════════════════════════════════════════════

  interface SaleInput {
    series: string; number: number; clientId: number; userId: number;
    subtotal: number; discount: number; tax: number; total: number;
    paymentMethod: PaymentMethod; createdAt: Date;
    details: { productId: number; quantity: number; unitPrice: number; discount: number; subtotal: number }[];
  }

  const salesInput: SaleInput[] = [
    {
      series: "VENT", number: 1, clientId: clientMap["Juan Pérez"], userId: userMap["cajero@tienda.com"],
      subtotal: 5.00, discount: 0, tax: 0.75, total: 5.75, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(26, 10, 30),
      details: [
        { productId: prodMap["PROD-001"], quantity: 3, unitPrice: 0.50, discount: 0, subtotal: 1.50 },
        { productId: prodMap["PROD-002"], quantity: 2, unitPrice: 1.25, discount: 0, subtotal: 2.50 },
        { productId: prodMap["PROD-015"], quantity: 1, unitPrice: 1.00, discount: 0, subtotal: 1.00 },
      ],
    },
    {
      series: "VENT", number: 2, clientId: clientMap["María González"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.60, discount: 0.50, tax: 0.92, total: 7.02, paymentMethod: PaymentMethod.TARJETA, createdAt: daysAgo(23, 11, 45),
      details: [
        { productId: prodMap["PROD-005"], quantity: 2, unitPrice: 1.20, discount: 0, subtotal: 2.40 },
        { productId: prodMap["PROD-008"], quantity: 1, unitPrice: 1.80, discount: 0, subtotal: 1.80 },
        { productId: prodMap["PROD-011"], quantity: 1, unitPrice: 1.10, discount: 0, subtotal: 1.10 },
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30 },
      ],
    },
    {
      series: "VENT", number: 3, clientId: clientMap["Consumidor Final"], userId: userMap["cajero@tienda.com"],
      subtotal: 3.75, discount: 0, tax: 0.56, total: 4.31, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(21, 15, 20),
      details: [
        { productId: prodMap["PROD-009"], quantity: 1, unitPrice: 2.25, discount: 0, subtotal: 2.25 },
        { productId: prodMap["PROD-010"], quantity: 1, unitPrice: 1.50, discount: 0, subtotal: 1.50 },
      ],
    },
    {
      series: "VENT", number: 4, clientId: clientMap["Carlos López"], userId: userMap["cajero@tienda.com"],
      subtotal: 11.00, discount: 0, tax: 1.65, total: 12.65, paymentMethod: PaymentMethod.TRANSFERENCIA, createdAt: daysAgo(19, 12, 10),
      details: [
        { productId: prodMap["PROD-002"], quantity: 4, unitPrice: 1.25, discount: 0, subtotal: 5.00 },
        { productId: prodMap["PROD-003"], quantity: 2, unitPrice: 1.25, discount: 0, subtotal: 2.50 },
        { productId: prodMap["PROD-015"], quantity: 2, unitPrice: 1.00, discount: 0, subtotal: 2.00 },
        { productId: prodMap["PROD-020"], quantity: 3, unitPrice: 0.50, discount: 0, subtotal: 1.50 },
      ],
    },
    {
      series: "VENT", number: 5, clientId: clientMap["Ana Martínez"], userId: userMap["cajero@tienda.com"],
      subtotal: 7.40, discount: 0, tax: 1.11, total: 8.51, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(17, 9, 30),
      details: [
        { productId: prodMap["PROD-017"], quantity: 1, unitPrice: 2.50, discount: 0, subtotal: 2.50 },
        { productId: prodMap["PROD-018"], quantity: 2, unitPrice: 1.80, discount: 0, subtotal: 3.60 },
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30 },
      ],
    },
    {
      series: "VENT", number: 6, clientId: clientMap["Pedro Ramírez"], userId: userMap["cajero@tienda.com"],
      subtotal: 4.80, discount: 0, tax: 0.72, total: 5.52, paymentMethod: PaymentMethod.QR, createdAt: daysAgo(14, 17, 0),
      details: [
        { productId: prodMap["PROD-011"], quantity: 2, unitPrice: 1.10, discount: 0, subtotal: 2.20 },
        { productId: prodMap["PROD-012"], quantity: 1, unitPrice: 1.60, discount: 0, subtotal: 1.60 },
        { productId: prodMap["PROD-013"], quantity: 1, unitPrice: 1.00, discount: 0, subtotal: 1.00 },
      ],
    },
    {
      series: "VENT", number: 7, clientId: clientMap["Lucía Fernández"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.10, discount: 1.00, tax: 0.77, total: 5.87, paymentMethod: PaymentMethod.TARJETA, createdAt: daysAgo(11, 14, 15),
      details: [
        { productId: prodMap["PROD-001"], quantity: 6, unitPrice: 0.50, discount: 1.00, subtotal: 3.00 },
        { productId: prodMap["PROD-016"], quantity: 3, unitPrice: 0.70, discount: 0, subtotal: 2.10 },
        { productId: prodMap["PROD-020"], quantity: 2, unitPrice: 0.50, discount: 0, subtotal: 1.00 },
      ],
    },
    {
      series: "VENT", number: 8, clientId: clientMap["Miguel Torres"], userId: userMap["cajero@tienda.com"],
      subtotal: 5.75, discount: 0, tax: 0.86, total: 6.61, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(9, 11, 0),
      details: [
        { productId: prodMap["PROD-005"], quantity: 1, unitPrice: 1.20, discount: 0, subtotal: 1.20 },
        { productId: prodMap["PROD-006"], quantity: 2, unitPrice: 0.80, discount: 0, subtotal: 1.60 },
        { productId: prodMap["PROD-007"], quantity: 1, unitPrice: 1.15, discount: 0, subtotal: 1.15 },
        { productId: prodMap["PROD-008"], quantity: 1, unitPrice: 1.80, discount: 0, subtotal: 1.80 },
      ],
    },
    {
      series: "VENT", number: 9, clientId: clientMap["Sofía Castillo"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.00, discount: 0, tax: 0.90, total: 6.90, paymentMethod: PaymentMethod.TRANSFERENCIA, createdAt: daysAgo(7, 16, 30),
      details: [
        { productId: prodMap["PROD-009"], quantity: 2, unitPrice: 2.25, discount: 0, subtotal: 4.50 },
        { productId: prodMap["PROD-010"], quantity: 1, unitPrice: 1.50, discount: 0, subtotal: 1.50 },
      ],
    },
    {
      series: "VENT", number: 10, clientId: clientMap["Diego Herrera"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.40, discount: 0, tax: 0.96, total: 7.36, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(5, 12, 45),
      details: [
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30 },
        { productId: prodMap["PROD-017"], quantity: 1, unitPrice: 2.50, discount: 0, subtotal: 2.50 },
        { productId: prodMap["PROD-012"], quantity: 1, unitPrice: 1.60, discount: 0, subtotal: 1.60 },
        { productId: prodMap["PROD-020"], quantity: 2, unitPrice: 0.50, discount: 0, subtotal: 1.00 },
      ],
    },
    {
      series: "VENT", number: 11, clientId: clientMap["Juan Pérez"], userId: userMap["cajero@tienda.com"],
      subtotal: 6.45, discount: 0, tax: 0.97, total: 7.42, paymentMethod: PaymentMethod.TARJETA, createdAt: daysAgo(3, 18, 20),
      details: [
        { productId: prodMap["PROD-003"], quantity: 3, unitPrice: 1.25, discount: 0, subtotal: 3.75 },
        { productId: prodMap["PROD-015"], quantity: 2, unitPrice: 1.00, discount: 0, subtotal: 2.00 },
        { productId: prodMap["PROD-016"], quantity: 1, unitPrice: 0.70, discount: 0, subtotal: 0.70 },
      ],
    },
    {
      series: "VENT", number: 12, clientId: clientMap["María González"], userId: userMap["cajero@tienda.com"],
      subtotal: 7.90, discount: 0.50, tax: 1.11, total: 8.51, paymentMethod: PaymentMethod.EFECTIVO, createdAt: daysAgo(1, 10, 15),
      details: [
        { productId: prodMap["PROD-011"], quantity: 3, unitPrice: 1.10, discount: 0, subtotal: 3.30 },
        { productId: prodMap["PROD-014"], quantity: 1, unitPrice: 1.80, discount: 0, subtotal: 1.80 },
        { productId: prodMap["PROD-019"], quantity: 1, unitPrice: 1.30, discount: 0, subtotal: 1.30 },
        { productId: prodMap["PROD-013"], quantity: 1, unitPrice: 1.00, discount: 0, subtotal: 1.00 },
        { productId: prodMap["PROD-020"], quantity: 1, unitPrice: 0.50, discount: 0, subtotal: 0.50 },
      ],
    },
  ];

  for (const si of salesInput) {
    const sale = await prisma.sale.create({
      data: {
        series: si.series, number: si.number, clientId: si.clientId,
        userId: si.userId, subtotal: si.subtotal, discount: si.discount,
        tax: si.tax, total: si.total, paymentMethod: si.paymentMethod,
        status: SaleStatus.COMPLETADA, createdAt: si.createdAt,
        details: { create: si.details },
      },
    });

    for (const d of si.details) {
      const before = stockTracker[d.productId];
      const after = before - d.quantity;
      stockTracker[d.productId] = after;
      allMovements.push({
        productId: d.productId, userId: si.userId, type: MovementType.SALE_OUT,
        quantity: d.quantity, stockBefore: before, stockAfter: after,
        reference: "sale", referenceId: sale.id, createdAt: si.createdAt,
      });
    }
  }
  console.log("Ventas creadas");

  // ═══════════════════════════════════════════════
  // MOVIMIENTOS DE INVENTARIO (bulk insert)
  // ═══════════════════════════════════════════════
  await prisma.inventoryMovement.createMany({
    data: allMovements.map((m) => ({
      productId: m.productId,
      userId: m.userId,
      type: m.type,
      quantity: m.type === MovementType.SALE_OUT ? -m.quantity : m.quantity,
      stockBefore: m.stockBefore,
      stockAfter: m.stockAfter,
      reference: m.reference,
      referenceId: m.referenceId,
      createdAt: m.createdAt,
    })),
  });
  console.log("Movimientos de inventario creados");

  // ═══════════════════════════════════════════════
  // FLUJO DE DEVOLUCIONES (2 devoluciones)
  // ═══════════════════════════════════════════════

  // Get sale IDs for reference
  const sales = await prisma.sale.findMany({ orderBy: { number: "asc" }, include: { details: true } });
  const saleByNumber = Object.fromEntries(sales.map((s) => [s.number, s]));

  // Return 1: Lucía Fernández devuelve 2 aguas minerales de su compra (V007)
  const sale7 = saleByNumber[7];
  const aguaDetail = sale7.details.find((d) => d.productId === prodMap["PROD-001"])!;

  await prisma.return.create({
    data: {
      saleId: sale7.id,
      userId: userMap["cajero@tienda.com"],
      reason: "Producto defectuoso - tapa rota",
      subtotal: 1.00,
      tax: 0.15,
      total: 1.15,
      createdAt: daysAgo(10, 16, 0),
      details: {
        create: {
          productId: prodMap["PROD-001"],
          quantity: 2,
          unitPrice: 0.50,
          subtotal: 1.00,
        },
      },
    },
  });

  // Update stock for return
  const prod001Before = stockTracker[prodMap["PROD-001"]];
  stockTracker[prodMap["PROD-001"]] = prod001Before + 2;
  allMovements.push({
    productId: prodMap["PROD-001"],
    userId: userMap["cajero@tienda.com"],
    type: MovementType.RETURN_IN,
    quantity: 2,
    stockBefore: prod001Before,
    stockAfter: prod001Before + 2,
    reference: "return",
    referenceId: null, // Will need to get the return ID
    createdAt: daysAgo(10, 16, 0),
  });

  // Return 2: Carlos López devuelve 1 papas fritas de V004
  const sale4 = saleByNumber[4];
  const papasDetail = sale4.details.find((d) => d.productId === prodMap["PROD-015"])!;

  await prisma.return.create({
    data: {
      saleId: sale4.id,
      userId: userMap["cajero@tienda.com"],
      reason: "Paquete abierto - producto en mal estado",
      subtotal: 1.00,
      tax: 0.15,
      total: 1.15,
      createdAt: daysAgo(15, 11, 30),
      details: {
        create: {
          productId: prodMap["PROD-015"],
          quantity: 1,
          unitPrice: 1.00,
          subtotal: 1.00,
        },
      },
    },
  });

  const prod015Before = stockTracker[prodMap["PROD-015"]];
  stockTracker[prodMap["PROD-015"]] = prod015Before + 1;
  allMovements.push({
    productId: prodMap["PROD-015"],
    userId: userMap["cajero@tienda.com"],
    type: MovementType.RETURN_IN,
    quantity: 1,
    stockBefore: prod015Before,
    stockAfter: prod015Before + 1,
    reference: "return",
    referenceId: null,
    createdAt: daysAgo(15, 11, 30),
  });

  // Update product stocks to reflect returns
  await prisma.product.update({
    where: { id: prodMap["PROD-001"] },
    data: { stock: stockTracker[prodMap["PROD-001"]] },
  });
  await prisma.product.update({
    where: { id: prodMap["PROD-015"] },
    data: { stock: stockTracker[prodMap["PROD-015"]] },
  });
  console.log("Devoluciones creadas");

  // ═══════════════════════════════════════════════
  // FLUJO DE CAJA (2 aperturas/cierres)
  // ═══════════════════════════════════════════════

  // Cash Register 1: covers sales 1-7 (days 26 to 11)
  const cr1 = await prisma.cashRegister.create({
    data: {
      userId: userMap["cajero@tienda.com"],
      openingDate: daysAgo(26, 8, 0),
      closingDate: daysAgo(10, 20, 0),
      initialAmount: 100.00,
      totalSales: 49.63,
      totalExpenses: 0,
      expectedTotal: 149.63,
      actualTotal: 150.00,
      difference: 0.37,
      observations: "Cierre parcial - fin de semana",
      status: CashRegisterStatus.CERRADA,
    },
  });

  // Cash Register 2: covers sales 8-12 (days 9 to 1)
  const cr2 = await prisma.cashRegister.create({
    data: {
      userId: userMap["cajero@tienda.com"],
      openingDate: daysAgo(9, 8, 0),
      closingDate: daysAgo(1, 20, 0),
      initialAmount: 150.00,
      totalSales: 36.80,
      totalExpenses: 0,
      expectedTotal: 186.80,
      actualTotal: 187.00,
      difference: 0.20,
      observations: "Cierre diario normal",
      status: CashRegisterStatus.CERRADA,
    },
  });

  // Cash movements for register 1 (sales deposits)
  await prisma.cashMovement.createMany({
    data: [
      { cashRegisterId: cr1.id, type: "INGRESO", amount: 5.75, description: "Venta VENT-0001", createdAt: daysAgo(26, 10, 30) },
      { cashRegisterId: cr1.id, type: "INGRESO", amount: 7.02, description: "Venta VENT-0002", createdAt: daysAgo(23, 11, 45) },
      { cashRegisterId: cr1.id, type: "INGRESO", amount: 4.31, description: "Venta VENT-0003", createdAt: daysAgo(21, 15, 20) },
      { cashRegisterId: cr1.id, type: "INGRESO", amount: 12.65, description: "Venta VENT-0004", createdAt: daysAgo(19, 12, 10) },
      { cashRegisterId: cr1.id, type: "INGRESO", amount: 8.51, description: "Venta VENT-0005", createdAt: daysAgo(17, 9, 30) },
      { cashRegisterId: cr1.id, type: "INGRESO", amount: 5.52, description: "Venta VENT-0006", createdAt: daysAgo(14, 17, 0) },
      { cashRegisterId: cr1.id, type: "INGRESO", amount: 5.87, description: "Venta VENT-0007", createdAt: daysAgo(11, 14, 15) },
    ],
  });

  // Cash movements for register 2 (sales deposits)
  await prisma.cashMovement.createMany({
    data: [
      { cashRegisterId: cr2.id, type: "INGRESO", amount: 6.61, description: "Venta VENT-0008", createdAt: daysAgo(9, 11, 0) },
      { cashRegisterId: cr2.id, type: "INGRESO", amount: 6.90, description: "Venta VENT-0009", createdAt: daysAgo(7, 16, 30) },
      { cashRegisterId: cr2.id, type: "INGRESO", amount: 7.36, description: "Venta VENT-0010", createdAt: daysAgo(5, 12, 45) },
      { cashRegisterId: cr2.id, type: "INGRESO", amount: 7.42, description: "Venta VENT-0011", createdAt: daysAgo(3, 18, 20) },
      { cashRegisterId: cr2.id, type: "INGRESO", amount: 8.51, description: "Venta VENT-0012", createdAt: daysAgo(1, 10, 15) },
    ],
  });
  console.log("Caja registradora creada");

  // ═══════════════════════════════════════════════
  // AUDITORÍA
  // ═══════════════════════════════════════════════
  await prisma.auditLog.createMany({
    data: [
      // Purchases
      { userId: userMap["bodega@tienda.com"], action: "create", entity: "purchase", entityId: 1, detail: "Compra COMP-0001 a Distribuidora Andina - S/ 35.65", createdAt: daysAgo(30, 8, 15) },
      { userId: userMap["bodega@tienda.com"], action: "create", entity: "purchase", entityId: 2, detail: "Compra COMP-0002 a Comercial El Mayorista - S/ 85.68", createdAt: daysAgo(27, 9, 0) },
      { userId: userMap["bodega@tienda.com"], action: "create", entity: "purchase", entityId: 3, detail: "Compra COMP-0003 a Lácteos San Pedro - S/ 48.99", createdAt: daysAgo(24, 7, 45) },
      { userId: userMap["bodega@tienda.com"], action: "create", entity: "purchase", entityId: 4, detail: "Compra COMP-0004 a Distribuidora Andina - S/ 36.80", createdAt: daysAgo(20, 10, 30) },
      { userId: userMap["bodega@tienda.com"], action: "create", entity: "purchase", entityId: 5, detail: "Compra COMP-0005 a Comercial El Mayorista - S/ 38.30", createdAt: daysAgo(16, 8, 0) },
      { userId: userMap["bodega@tienda.com"], action: "create", entity: "purchase", entityId: 6, detail: "Compra COMP-0006 a Cárnicos del Sur - S/ 37.95", createdAt: daysAgo(12, 9, 15) },
      { userId: userMap["bodega@tienda.com"], action: "create", entity: "purchase", entityId: 7, detail: "Compra COMP-0007 a Panificadora El Trigal - S/ 18.40", createdAt: daysAgo(8, 11, 0) },
      // Sales
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 1, detail: "Venta VENT-0001 a Juan Pérez - S/ 5.75 (EFECTIVO)", createdAt: daysAgo(26, 10, 30) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 2, detail: "Venta VENT-0002 a María González - S/ 7.02 (TARJETA)", createdAt: daysAgo(23, 11, 45) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 3, detail: "Venta VENT-0003 a Consumidor Final - S/ 4.31 (EFECTIVO)", createdAt: daysAgo(21, 15, 20) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 4, detail: "Venta VENT-0004 a Carlos López - S/ 12.65 (TRANSFERENCIA)", createdAt: daysAgo(19, 12, 10) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 5, detail: "Venta VENT-0005 a Ana Martínez - S/ 8.51 (EFECTIVO)", createdAt: daysAgo(17, 9, 30) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 6, detail: "Venta VENT-0006 a Pedro Ramírez - S/ 5.52 (QR)", createdAt: daysAgo(14, 17, 0) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 7, detail: "Venta VENT-0007 a Lucía Fernández - S/ 5.87 (TARJETA)", createdAt: daysAgo(11, 14, 15) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 8, detail: "Venta VENT-0008 a Miguel Torres - S/ 6.61 (EFECTIVO)", createdAt: daysAgo(9, 11, 0) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 9, detail: "Venta VENT-0009 a Sofía Castillo - S/ 6.90 (TRANSFERENCIA)", createdAt: daysAgo(7, 16, 30) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 10, detail: "Venta VENT-0010 a Diego Herrera - S/ 7.36 (EFECTIVO)", createdAt: daysAgo(5, 12, 45) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 11, detail: "Venta VENT-0011 a Juan Pérez - S/ 7.42 (TARJETA)", createdAt: daysAgo(3, 18, 20) },
      { userId: userMap["cajero@tienda.com"], action: "create", entity: "sale", entityId: 12, detail: "Venta VENT-0012 a María González - S/ 8.51 (EFECTIVO)", createdAt: daysAgo(1, 10, 15) },
      // Cash registers
      { userId: userMap["cajero@tienda.com"], action: "close", entity: "cash_register", entityId: cr1.id, detail: "Cierre de caja #1 - Total: S/ 150.00", createdAt: daysAgo(10, 20, 0) },
      { userId: userMap["cajero@tienda.com"], action: "close", entity: "cash_register", entityId: cr2.id, detail: "Cierre de caja #2 - Total: S/ 187.00", createdAt: daysAgo(1, 20, 0) },
    ],
  });
  console.log("Auditoría creada");

  // ═══════════════════════════════════════════════
  // CONFIGURACIÓN DE TIENDA
  // ═══════════════════════════════════════════════
  await prisma.storeConfig.create({
    data: {
      storeName: "Mi Tienda",
      ruc: "9999999999001",
      address: "Av. Principal 123, Quito",
      phone: "0999999999",
      email: "contacto@mitienda.com",
      currency: "USD",
      taxPercentage: 15,
    },
  });
  console.log("Configuración de tienda creada");

  console.log("\n✅ Seed completado exitosamente!");
  console.log(`   - ${perms.length} permisos`);
  console.log(`   - ${roles.length} roles`);
  console.log(`   - ${users.length} usuarios`);
  console.log(`   - ${cats.length} categorías`);
  console.log(`   - ${provs.length} proveedores`);
  console.log(`   - ${clients.length} clientes`);
  console.log(`   - ${prods.length} productos`);
  console.log(`   - ${purchasesInput.length} compras (${purchasesInput.reduce((s, p) => s + p.details.length, 0)} detalles)`);
  console.log(`   - ${salesInput.length} ventas (${salesInput.reduce((s, p) => s + p.details.length, 0)} detalles)`);
  console.log(`   - 2 devoluciones`);
  console.log(`   - 2 arqueos de caja`);
  console.log(`   - ${allMovements.length} movimientos de inventario`);
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
