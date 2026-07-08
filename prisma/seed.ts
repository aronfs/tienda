import {
  PrismaClient,
  PaymentMethod,
  SaleStatus,
  PurchaseStatus,
  MovementType,
  CashRegisterStatus,
  TaxAppliesTo,
  InvoiceResolutionStatus,
  BranchStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(days: number, hour = 10, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d;
}

function todayAt(hour: number, min = 0): Date {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d;
}

const PERMISSION_NAMES = [
  "company:read", "company:update",
  "branches:create", "branches:read", "branches:update", "branches:delete",
  "taxes:create", "taxes:read", "taxes:update", "taxes:delete",
  "billing:read", "billing:update",
  "setup:initialize", "setup:read",
  "products:create", "products:read", "products:update", "products:delete",
  "sales:create", "sales:read",
  "purchases:create", "purchases:read",
  "inventory:adjust",
  "cash:open", "cash:close",
  "reports:read", "reports:generate", "reports:download", "reports:delete",
  "users:manage",
  "settings:manage",
  "analytics:read",
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMINISTRADOR: PERMISSION_NAMES,
  SUPERVISOR: [
    "company:read", "branches:read", "taxes:read", "billing:read", "setup:read",
    "products:read", "products:update",
    "sales:read",
    "purchases:read",
    "inventory:adjust",
    "cash:open", "cash:close",
    "reports:read", "reports:generate", "reports:download",
    "analytics:read",
  ],
  CAJERO: [
    "products:read",
    "sales:create", "sales:read",
    "cash:open", "cash:close",
  ],
  BODEGUERO: [
    "products:create", "products:read", "products:update",
    "purchases:create", "purchases:read",
    "inventory:adjust",
  ],
};

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function createRolesAndPermissions(): Promise<{
  roleMap: Record<string, number>;
  permMap: Record<string, number>;
}> {
  await prisma.permission.createMany({
    data: PERMISSION_NAMES.map((name) => ({ name })),
  });
  const perms = await prisma.permission.findMany();
  const permMap = Object.fromEntries(perms.map((p) => [p.name, p.id]));

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

  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.rolePermission.createMany({
      data: permNames.map((n) => ({
        roleId: roleMap[roleName],
        permissionId: permMap[n],
      })),
    });
  }

  return { roleMap, permMap };
}

interface CompanyInput {
  legalName: string;
  commercialName: string;
  taxId: string;
  email: string;
  phone: string;
  website: string;
  mainAddress: string;
}

interface UserInput {
  name: string;
  email: string;
  password: string;
  roleName: string;
}

interface BranchInput {
  code: string;
  name: string;
  city: string;
  country: string;
  address: string;
  managerName: string;
}

interface RegionalConfigInput {
  baseCurrency: string;
  timezone: string;
  dateFormat: string;
  decimalSeparator: string;
  thousandSeparator: string;
  language: string;
  country: string;
}

interface BillingConfigInput {
  invoicePrefixDefault: string;
  invoiceFooterText: string;
  includeTaxInPrice: boolean;
  autoGenerateInvoiceNumber: boolean;
  allowInvoiceWithoutResolution: boolean;
}

interface ResolutionInput {
  prefix: string;
  startNumber: number;
  endNumber: number;
  currentNumber: number;
  authorizationCode: string;
  validFrom: string;
  validUntil: string;
}

interface TaxInput {
  name: string;
  description: string;
  rate: number;
  isDefault: boolean;
  appliesTo: TaxAppliesTo;
}

interface CategoryInput {
  name: string;
  description?: string;
}

interface ProviderInput {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}

interface ClientInput {
  name: string;
  docType: string;
  docNumber: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface ProductInput {
  code: string;
  barcode: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  categoryName: string;
  providerName: string;
  taxName: string;
}

async function createCompanyFullData(
  roleMap: Record<string, number>,
  companyInput: CompanyInput,
  usersInput: UserInput[],
  branchInput: BranchInput,
  regionalInput: RegionalConfigInput,
  billingInput: BillingConfigInput,
  resolutionInput: ResolutionInput,
  taxesInput: TaxInput[],
  categoriesInput: CategoryInput[],
  providersInput: ProviderInput[],
  clientsInput: ClientInput[],
  productsInput: ProductInput[],
) {
  const company = await prisma.company.create({ data: companyInput });

  await prisma.regionalConfig.create({
    data: { companyId: company.id, ...regionalInput },
  });

  const mainBranch = await prisma.branch.create({
    data: {
      companyId: company.id,
      ...branchInput,
      status: BranchStatus.OPERATIVE,
      isMain: true,
    },
  });

  await prisma.billingConfig.create({
    data: { companyId: company.id, ...billingInput },
  });

  const resolution = await prisma.invoiceResolution.create({
    data: {
      companyId: company.id,
      branchId: mainBranch.id,
      ...resolutionInput,
      validFrom: new Date(resolutionInput.validFrom),
      validUntil: new Date(resolutionInput.validUntil),
      status: InvoiceResolutionStatus.ACTIVE,
    },
  });

  const users: { id: number; email: string }[] = [];
  for (const u of usersInput) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: await hashPassword(u.password),
        roleId: roleMap[u.roleName],
        companyId: company.id,
        branchId: mainBranch.id,
      },
    });
    users.push(user);
  }
  const userMap = Object.fromEntries(users.map((u) => [u.email, u.id]));

  const taxes: { id: number; name: string; rate: number }[] = [];
  for (const t of taxesInput) {
    const tax = await prisma.tax.create({
      data: { companyId: company.id, ...t },
    });
    taxes.push(tax);
  }
  const taxMap = Object.fromEntries(taxes.map((t) => [t.name, t]));

  const cats: { id: number; name: string }[] = [];
  for (const c of categoriesInput) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, description: c.description },
    });
    cats.push(cat);
  }
  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  const provs: { id: number; name: string }[] = [];
  for (const p of providersInput) {
    const prov = await prisma.provider.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
    provs.push(prov);
  }
  const provMap = Object.fromEntries(provs.map((p) => [p.name, p.id]));

  const clients: { id: number; name: string }[] = [];
  for (const c of clientsInput) {
    const client = await prisma.client.upsert({
      where: { name: c.name },
      update: {},
      create: {
        name: c.name,
        docType: c.docType,
        docNumber: c.docNumber,
        phone: c.phone ?? null,
        email: c.email ?? null,
        address: c.address ?? null,
      },
    });
    clients.push(client);
  }
  const clientMap = Object.fromEntries(clients.map((c) => [c.name, c.id]));

  const prods: { id: number; code: string; stock: number }[] = [];
  for (const p of productsInput) {
    const product = await prisma.product.create({
      data: {
        code: p.code,
        barcode: p.barcode,
        name: p.name,
        categoryId: catMap[p.categoryName],
        providerId: provMap[p.providerName],
        companyId: company.id,
        taxId: taxMap[p.taxName].id,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        stock: p.stock,
        minStock: p.minStock,
      },
    });
    prods.push(product);
  }
  const prodMap = Object.fromEntries(prods.map((p) => [p.code, p]));

  const adminUserId = userMap[usersInput[0].email];

  await prisma.auditLog.createMany({
    data: [
      { userId: adminUserId, action: "CREATE", entity: "Company", entityId: company.id, detail: `Empresa ${companyInput.commercialName} creada` },
      { userId: adminUserId, action: "CREATE", entity: "Branch", entityId: mainBranch.id, detail: `Sucursal ${mainBranch.name} creada` },
    ],
  });

  for (const t of taxes) {
    await prisma.auditLog.create({
      data: { userId: adminUserId, action: "CREATE", entity: "Tax", entityId: t.id, detail: `Impuesto ${t.name} (${t.rate}%) configurado` },
    });
  }

  await prisma.auditLog.create({
    data: { userId: adminUserId, action: "CREATE", entity: "BillingConfig", entityId: company.id, detail: "Configuración de facturación creada" },
  });

  for (const p of prods) {
    await prisma.auditLog.create({
      data: { userId: adminUserId, action: "CREATE", entity: "Product", entityId: p.id, detail: `Producto ${p.name} creado` },
    });
  }

  async function createPurchase(
    providerName: string,
    userEmail: string,
    daysBack: number,
    items: { code: string; qty: number }[],
  ) {
    const provId = provMap[providerName];
    const userId = userMap[userEmail];
    let subtotal = 0;
    const details: {
      productId: number;
      quantity: number;
      unitCost: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const prod = prods.find((p) => p.code === item.code)!;
      const fullProduct = productsInput.find((p) => p.code === item.code)!;
      const unitCost = fullProduct.purchasePrice;
      const lineSubtotal = unitCost * item.qty;
      subtotal += lineSubtotal;
      details.push({
        productId: prod.id,
        quantity: item.qty,
        unitCost,
        subtotal: lineSubtotal,
      });

      await prisma.product.update({
        where: { id: prod.id },
        data: { stock: { increment: item.qty } },
      });
    }

    const taxRate = 0.15;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax;

    const purchase = await prisma.purchase.create({
      data: {
        companyId: company.id,
        branchId: mainBranch.id,
        userId,
        providerId: provId,
        subtotal,
        tax,
        taxTotal: tax,
        total,
        status: PurchaseStatus.COMPLETADA,
        createdAt: daysAgo(daysBack, 9, 0),
        details: { create: details },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entity: "Purchase",
        entityId: purchase.id,
        detail: `Compra #${purchase.id} registrada a ${providerName}`,
      },
    });

    const warehouseUserId = userMap[userEmail];
    for (const item of items) {
      const prod = prods.find((p) => p.code === item.code)!;
      const fullProduct = productsInput.find((p) => p.code === item.code)!;
      await prisma.inventoryMovement.create({
        data: {
          productId: prod.id,
          userId: warehouseUserId,
          companyId: company.id,
          branchId: mainBranch.id,
          type: MovementType.PURCHASE_IN,
          quantity: item.qty,
          stockBefore: prod.stock - item.qty,
          stockAfter: prod.stock,
          reference: "PURCHASE",
          referenceId: purchase.id,
          note: `Compra a ${providerName}`,
        },
      });
    }
  }

  async function createSale(
    clientName: string,
    userEmail: string,
    daysBack: number,
    paymentMethod: PaymentMethod,
    items: { code: string; qty: number }[],
  ) {
    const clientId = clientMap[clientName];
    const userId = userMap[userEmail];
    let subtotal = 0;
    let taxSum = 0;
    const details: {
      productId: number;
      quantity: number;
      unitPrice: number;
      discount: number;
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      totalLine: number;
      taxId: number;
    }[] = [];

    for (const item of items) {
      const prod = prods.find((p) => p.code === item.code)!;
      const fullProduct = productsInput.find((p) => p.code === item.code)!;
      const prodTax = taxMap[fullProduct.taxName];
      const unitPrice = fullProduct.salePrice;
      const lineSubtotal = unitPrice * item.qty;
      const taxRate = prodTax.rate;
      const taxAmount = Math.round(lineSubtotal * (taxRate / 100) * 100) / 100;
      const totalLine = lineSubtotal + taxAmount;

      subtotal += lineSubtotal;
      taxSum += taxAmount;

      details.push({
        productId: prod.id,
        quantity: item.qty,
        unitPrice,
        discount: 0,
        subtotal: lineSubtotal,
        taxRate,
        taxAmount,
        totalLine,
        taxId: prodTax.id,
      });

      await prisma.product.update({
        where: { id: prod.id },
        data: { stock: { decrement: item.qty } },
      });
    }

    const total = subtotal + taxSum;
    const resolvedNumber = resolution.currentNumber + 1;
    const invoiceNumber = `${resolution.prefix}-${String(resolvedNumber).padStart(8, "0")}`;

    await prisma.invoiceResolution.update({
      where: { id: resolution.id },
      data: { currentNumber: resolvedNumber },
    });

    const sale = await prisma.sale.create({
      data: {
        companyId: company.id,
        branchId: mainBranch.id,
        clientId,
        userId,
        subtotal,
        tax: taxSum,
        taxTotal: taxSum,
        total,
        paymentMethod,
        status: SaleStatus.COMPLETADA,
        createdAt: daysAgo(daysBack, 11, 0),
        invoicePrefix: resolution.prefix,
        invoiceResolutionId: resolution.id,
        invoiceNumber,
        details: {
          create: details.map((d) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            discount: d.discount,
            subtotal: d.subtotal,
            taxId: d.taxId,
            taxRate: d.taxRate,
            taxAmount: d.taxAmount,
            totalLine: d.totalLine,
          })),
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entity: "Sale",
        entityId: sale.id,
        detail: `Venta #${sale.id} por ${total.toFixed(2)} USD`,
      },
    });

    for (const d of details) {
      const prod = prods.find((p) => p.id === d.productId)!;
      await prisma.inventoryMovement.create({
        data: {
          productId: d.productId,
          userId,
          companyId: company.id,
          branchId: mainBranch.id,
          type: MovementType.SALE_OUT,
          quantity: d.quantity,
          stockBefore: prod.stock + d.quantity,
          stockAfter: prod.stock,
          reference: "SALE",
          referenceId: sale.id,
          note: `Venta #${sale.id}`,
        },
      });
    }

    return { sale, total };
  }

  await createPurchase(providersInput[0].name, usersInput[2].email, 15, [
    { code: productsInput[0].code, qty: 20 },
    { code: productsInput[1].code, qty: 10 },
  ]);

  await createPurchase(providersInput[1].name, usersInput[2].email, 10, [
    { code: productsInput[3].code, qty: 15 },
    { code: productsInput[4].code, qty: 20 },
  ]);

  const sale1 = await createSale(
    clientsInput[1].name, usersInput[1].email, 7, PaymentMethod.EFECTIVO, [
    { code: productsInput[0].code, qty: 2 },
    { code: productsInput[2].code, qty: 1 },
  ]);

  const sale2 = await createSale(
    clientsInput[2].name, usersInput[1].email, 5, PaymentMethod.TRANSFERENCIA, [
    { code: productsInput[1].code, qty: 1 },
    { code: productsInput[5].code, qty: 5 },
  ]);

  const sale3 = await createSale(
    clientsInput[3].name, usersInput[1].email, 2, PaymentMethod.TARJETA, [
    { code: productsInput[3].code, qty: 2 },
    { code: productsInput[4].code, qty: 1 },
  ]);

  const dayAgo = daysAgo(1, 8, 0);
  const yesterdayClose = daysAgo(1, 20, 0);
  const todayOpen = todayAt(7, 0);

  const cashierId = userMap[usersInput[1].email];

  const closedCashRegister = await prisma.cashRegister.create({
    data: {
      userId: cashierId,
      companyId: company.id,
      branchId: mainBranch.id,
      openingDate: dayAgo,
      closingDate: yesterdayClose,
      initialAmount: 100,
      totalSales: sale1.total,
      totalExpenses: 0,
      expectedTotal: 100 + sale1.total,
      actualTotal: 100 + sale1.total,
      difference: 0,
      observations: "Cierre del día anterior",
      status: CashRegisterStatus.CERRADA,
    },
  });

  await prisma.cashMovement.create({
    data: {
      cashRegisterId: closedCashRegister.id,
      type: "INGRESO",
      amount: sale1.total,
      description: `Venta día anterior`,
    },
  });

  const openCashRegister = await prisma.cashRegister.create({
    data: {
      userId: cashierId,
      companyId: company.id,
      branchId: mainBranch.id,
      openingDate: todayOpen,
      initialAmount: 100,
      totalSales: sale2.total + sale3.total,
      totalExpenses: 0,
      expectedTotal: 100 + sale2.total + sale3.total,
      actualTotal: 100 + sale2.total + sale3.total,
      status: CashRegisterStatus.ABIERTA,
    },
  });

  await prisma.cashMovement.createMany({
    data: [
      {
        cashRegisterId: openCashRegister.id,
        type: "INGRESO",
        amount: sale2.total,
        description: "Venta TRANSFERENCIA",
        createdAt: daysAgo(5, 11, 0),
      },
      {
        cashRegisterId: openCashRegister.id,
        type: "INGRESO",
        amount: sale3.total,
        description: "Venta TARJETA",
        createdAt: daysAgo(2, 11, 0),
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      userId: cashierId,
      action: "OPEN",
      entity: "CashRegister",
      entityId: openCashRegister.id,
      detail: "Caja abierta",
    },
  });

  const totalPurchasesCreated = 2;
  const totalSalesCreated = 3;
  const totalCashRegistersCreated = 2;

  return {
    company,
    mainBranch,
    userMap,
    taxMap,
    catMap,
    provMap,
    clientMap,
    prodMap,
    productsCount: productsInput.length,
    clientsCount: clientsInput.length,
    providersCount: providersInput.length,
    totalPurchasesCreated,
    totalSalesCreated,
    totalCashRegistersCreated,
  };
}

async function main() {
  console.log("Iniciando seed multiempresa...\n");

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
  console.log("Datos existentes eliminados\n");

  const { roleMap } = await createRolesAndPermissions();
  console.log("Roles y permisos creados\n");

  // ──────────────────────────────────────────────────
  // EMPRESA 1: TechNova Solutions
  // ──────────────────────────────────────────────────
  const technova = await createCompanyFullData(
    roleMap,
    {
      legalName: "TechNova Solutions S.A.",
      commercialName: "TechNova Store",
      taxId: "1790012345001",
      email: "admin@technova.com",
      phone: "0991002003",
      website: "https://technova-store.com",
      mainAddress: "Av. República y Naciones Unidas, Quito, Ecuador",
    },
    [
      { name: "Administrador TechNova", email: "admin@technova.com", password: "Admin123!", roleName: "ADMINISTRADOR" },
      { name: "Cajero TechNova", email: "cajero@technova.com", password: "Cajero123!", roleName: "CAJERO" },
      { name: "Bodeguero TechNova", email: "bodega@technova.com", password: "Bodega123!", roleName: "BODEGUERO" },
    ],
    {
      code: "TN-UIO-01",
      name: "TechNova Matriz Quito",
      city: "Quito",
      country: "Ecuador",
      address: "Av. República E7-123 y Eloy Alfaro",
      managerName: "Administrador TechNova",
    },
    {
      baseCurrency: "USD",
      timezone: "America/Guayaquil",
      dateFormat: "DD/MM/YYYY",
      decimalSeparator: ".",
      thousandSeparator: ",",
      language: "es",
      country: "Ecuador",
    },
    {
      invoicePrefixDefault: "TN",
      invoiceFooterText: "Gracias por comprar tecnología en TechNova Store",
      includeTaxInPrice: false,
      autoGenerateInvoiceNumber: true,
      allowInvoiceWithoutResolution: false,
    },
    {
      prefix: "TN",
      startNumber: 1,
      endNumber: 5000,
      currentNumber: 1,
      authorizationCode: "TN-RES-2026-001",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
    },
    [
      { name: "IVA General", description: "Impuesto al valor agregado general", rate: 15, isDefault: true, appliesTo: TaxAppliesTo.BOTH },
      { name: "IVA Cero", description: "Productos con IVA 0%", rate: 0, isDefault: false, appliesTo: TaxAppliesTo.BOTH },
    ],
    [
      { name: "Laptops", description: "Computadoras portátiles" },
      { name: "Smartphones", description: "Teléfonos inteligentes" },
      { name: "Accesorios", description: "Accesorios tecnológicos" },
      { name: "Periféricos", description: "Periféricos de computadora" },
      { name: "Componentes", description: "Componentes de hardware" },
    ],
    [
      { name: "Importadora Digital Ecuador", contact: "Carlos Sánchez", phone: "0992003004", email: "ventas@importadoradigital.com", address: "Av. Amazonas 456, Quito" },
      { name: "Distribuidora Hardware Pro", contact: "María Andrade", phone: "0993004005", email: "ventas@hardwarepro.com", address: "Calle Industrias 789, Quito" },
      { name: "MobileTech Wholesale", contact: "Pedro López", phone: "0994005006", email: "ventas@mobiletech.com", address: "Av. Tecnológica 321, Quito" },
    ],
    [
      { name: "Consumidor Final", docType: "DNI", docNumber: "0000000000" },
      { name: "Carlos Andrade", docType: "DNI", docNumber: "1712345678", phone: "0995123456", email: "carlos.andrade@email.com", address: "Calle Amazonas 123" },
      { name: "Lucía Torres", docType: "DNI", docNumber: "1723456789", phone: "0996234567", email: "lucia.torres@email.com", address: "Av. República 456" },
      { name: "Empresa Soluciones Andinas", docType: "RUC", docNumber: "1798765432001", phone: "0997345678", email: "facturas@solucionesandinas.com", address: "Av. Naciones Unidas 789" },
    ],
    [
      { code: "TN-P001", barcode: "786100000001", name: "Laptop Lenovo ThinkPad E14", purchasePrice: 620, salePrice: 799.99, stock: 15, minStock: 3, categoryName: "Laptops", providerName: "Importadora Digital Ecuador", taxName: "IVA General" },
      { code: "TN-P002", barcode: "786100000002", name: "MacBook Air M2 13", purchasePrice: 920, salePrice: 1199.99, stock: 8, minStock: 2, categoryName: "Laptops", providerName: "Importadora Digital Ecuador", taxName: "IVA General" },
      { code: "TN-P003", barcode: "786100000003", name: "Samsung Galaxy A55", purchasePrice: 280, salePrice: 379.99, stock: 20, minStock: 5, categoryName: "Smartphones", providerName: "MobileTech Wholesale", taxName: "IVA General" },
      { code: "TN-P004", barcode: "786100000004", name: "Mouse Logitech MX Master 3S", purchasePrice: 58, salePrice: 89.99, stock: 30, minStock: 6, categoryName: "Periféricos", providerName: "Distribuidora Hardware Pro", taxName: "IVA General" },
      { code: "TN-P005", barcode: "786100000005", name: "Teclado Mecánico Redragon Kumara", purchasePrice: 32, salePrice: 54.99, stock: 25, minStock: 5, categoryName: "Periféricos", providerName: "Distribuidora Hardware Pro", taxName: "IVA General" },
      { code: "TN-P006", barcode: "786100000006", name: "Cable USB-C 1m", purchasePrice: 2.5, salePrice: 6.99, stock: 100, minStock: 20, categoryName: "Accesorios", providerName: "MobileTech Wholesale", taxName: "IVA General" },
    ],
  );
  console.log("✅ TechNova Store creada");

  // ──────────────────────────────────────────────────
  // EMPRESA 2: MiniMarket San José
  // ──────────────────────────────────────────────────
  const minimarket = await createCompanyFullData(
    roleMap,
    {
      legalName: "MiniMarket San José S.A.S.",
      commercialName: "MiniMarket San José",
      taxId: "0998765432001",
      email: "admin@minimarket.com",
      phone: "0987654321",
      website: "https://minimarket-sanjose.com",
      mainAddress: "Calle Principal y Av. Central, Guayaquil, Ecuador",
    },
    [
      { name: "Administrador MiniMarket", email: "admin@minimarket.com", password: "Admin123!", roleName: "ADMINISTRADOR" },
      { name: "Cajero MiniMarket", email: "cajero@minimarket.com", password: "Cajero123!", roleName: "CAJERO" },
      { name: "Bodeguero MiniMarket", email: "bodega@minimarket.com", password: "Bodega123!", roleName: "BODEGUERO" },
    ],
    {
      code: "MM-GYE-01",
      name: "MiniMarket Matriz Guayaquil",
      city: "Guayaquil",
      country: "Ecuador",
      address: "Calle Principal 123 y Av. Central",
      managerName: "Administrador MiniMarket",
    },
    {
      baseCurrency: "USD",
      timezone: "America/Guayaquil",
      dateFormat: "DD/MM/YYYY",
      decimalSeparator: ".",
      thousandSeparator: ",",
      language: "es",
      country: "Ecuador",
    },
    {
      invoicePrefixDefault: "MM",
      invoiceFooterText: "Gracias por comprar en MiniMarket San José",
      includeTaxInPrice: true,
      autoGenerateInvoiceNumber: true,
      allowInvoiceWithoutResolution: true,
    },
    {
      prefix: "MM",
      startNumber: 1,
      endNumber: 3000,
      currentNumber: 1,
      authorizationCode: "MM-RES-2026-001",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
    },
    [
      { name: "IVA General", description: "Impuesto al valor agregado general", rate: 15, isDefault: true, appliesTo: TaxAppliesTo.BOTH },
      { name: "IVA Cero", description: "Productos con IVA 0%", rate: 0, isDefault: false, appliesTo: TaxAppliesTo.BOTH },
      { name: "IVA Reducido", description: "Impuesto reducido para productos seleccionados", rate: 5, isDefault: false, appliesTo: TaxAppliesTo.BOTH },
    ],
    [
      { name: "Bebidas", description: "Bebidas y refrescos" },
      { name: "Abarrotes", description: "Productos de despensa" },
      { name: "Lácteos", description: "Productos lácteos y derivados" },
      { name: "Limpieza", description: "Productos de limpieza y hogar" },
      { name: "Snacks", description: "Snacks, botanas y galletas" },
    ],
    [
      { name: "Distribuidora Andina", contact: "Juan Carlos Mendoza", phone: "0987654321", email: "ventas@distribuidoraandina.com", address: "Av. Principal 123, Quito" },
      { name: "Comercial El Mayorista", contact: "María López", phone: "0976543210", email: "ventas@elmayorista.com", address: "Calle Comercio 456, Guayaquil" },
      { name: "Lácteos San Pedro", contact: "Pedro Sánchez", phone: "0965432109", email: "info@lacteossanpedro.com", address: "Av. Lechera 789, Cuenca" },
    ],
    [
      { name: "Consumidor Final", docType: "DNI", docNumber: "0000000000" },
      { name: "Juan Pérez", docType: "DNI", docNumber: "0912345678", phone: "0988456123", email: "juan.perez@email.com", address: "Calle Los Olivos 123" },
      { name: "María González", docType: "DNI", docNumber: "0923456789", phone: "0989567234", email: "maria.gonzalez@email.com", address: "Av. Primavera 456" },
      { name: "Tienda Vecina La Esquina", docType: "RUC", docNumber: "0998765432001", phone: "0990678345", email: "laesquina@email.com", address: "Calle Comercio 789" },
    ],
    [
      { code: "MM-P001", barcode: "786200000001", name: "Agua Mineral 500ml", purchasePrice: 0.25, salePrice: 0.5, stock: 120, minStock: 20, categoryName: "Bebidas", providerName: "Distribuidora Andina", taxName: "IVA General" },
      { code: "MM-P002", barcode: "786200000002", name: "Coca-Cola 1L", purchasePrice: 0.8, salePrice: 1.25, stock: 90, minStock: 15, categoryName: "Bebidas", providerName: "Distribuidora Andina", taxName: "IVA General" },
      { code: "MM-P003", barcode: "786200000003", name: "Arroz 1kg", purchasePrice: 0.9, salePrice: 1.2, stock: 80, minStock: 20, categoryName: "Abarrotes", providerName: "Comercial El Mayorista", taxName: "IVA Cero" },
      { code: "MM-P004", barcode: "786200000004", name: "Leche Entera 1L", purchasePrice: 0.75, salePrice: 1.1, stock: 70, minStock: 15, categoryName: "Lácteos", providerName: "Lácteos San Pedro", taxName: "IVA Cero" },
      { code: "MM-P005", barcode: "786200000005", name: "Detergente 1kg", purchasePrice: 1.5, salePrice: 2.25, stock: 45, minStock: 10, categoryName: "Limpieza", providerName: "Comercial El Mayorista", taxName: "IVA General" },
      { code: "MM-P006", barcode: "786200000006", name: "Papas Fritas 150g", purchasePrice: 0.6, salePrice: 1.0, stock: 100, minStock: 20, categoryName: "Snacks", providerName: "Distribuidora Andina", taxName: "IVA General" },
    ],
  );
  console.log("✅ MiniMarket San José creada\n");

  // ─── SUMMARY ──────────────────────────────────────
  const totalCompanies = 2;
  const totalUsers = 6;
  const totalBranches = 2;
  const totalProducts = technova.productsCount + minimarket.productsCount;
  const totalClients = technova.clientsCount + minimarket.clientsCount;
  const totalProviders = technova.providersCount + minimarket.providersCount;
  const totalPurchases = technova.totalPurchasesCreated + minimarket.totalPurchasesCreated;
  const totalSales = technova.totalSalesCreated + minimarket.totalSalesCreated;
  const totalCashRegisters = technova.totalCashRegistersCreated + minimarket.totalCashRegistersCreated;

  console.log("═══════════════════════════════════════");
  console.log("  Seed ejecutado correctamente");
  console.log("═══════════════════════════════════════");
  console.log(`  Empresas creadas:     ${totalCompanies}`);
  console.log(`  Usuarios creados:     ${totalUsers}`);
  console.log(`  Sucursales creadas:   ${totalBranches}`);
  console.log(`  Productos creados:    ${totalProducts}`);
  console.log(`  Clientes creados:     ${totalClients}`);
  console.log(`  Proveedores creados:  ${totalProviders}`);
  console.log(`  Compras creadas:      ${totalPurchases}`);
  console.log(`  Ventas creadas:       ${totalSales}`);
  console.log(`  Cajas creadas:        ${totalCashRegisters}`);
  console.log("─────────────────────────────────────────");
  console.log("  Credenciales:");
  console.log("  TechNova:");
  console.log("    admin@technova.com / Admin123!");
  console.log("    cajero@technova.com / Cajero123!");
  console.log("    bodega@technova.com / Bodega123!");
  console.log("  MiniMarket:");
  console.log("    admin@minimarket.com / Admin123!");
  console.log("    cajero@minimarket.com / Cajero123!");
  console.log("    bodega@minimarket.com / Bodega123!");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Error en seed multiempresa:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });