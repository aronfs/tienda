const BASE = "http://localhost:3000/api";

let pass = 0;
let fail = 0;
let token = "";

async function req(method: string, path: string, body?: any, auth?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${auth}`;
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, text };
}

function assert(label: string, condition: boolean) {
  if (condition) { console.log(`  ✓ ${label}`); pass++; }
  else { console.log(`  ✗ ${label}`); fail++; }
}

async function main() {
  console.log("\n==== CASO 1: SETUP STATUS (SIN INICIALIZAR) ====");
  let r = await req("GET", "/setup/status");
  assert("GET /setup/status → 200", r.status === 200);
  assert("isInitialized = false", r.data.data.isInitialized === false);
  assert("nextStep = COMPANY_SETUP", r.data.data.nextStep === "COMPANY_SETUP");

  console.log("\n==== CASO 2: LOGIN ADMIN (SIN EMPRESA) ====");
  r = await req("POST", "/auth/login", { email: "admin@tienda.com", password: "Admin123!" });
  assert("Login retorna 200", r.status === 200);
  assert("Login retorna token", !!r.data.data.token);
  token = r.data.data.token;
  assert("companyId es null", r.data.data.user.companyId === null);

  console.log("\n==== CASO 3: BLOQUEAR CREAR PRODUCTO SIN SETUP ====");
  r = await req("POST", "/products", { code: "TEST-001", name: "Test", categoryId: 1, providerId: 1, purchasePrice: 1, salePrice: 2 }, token);
  assert("Crear producto bloqueado (categoría no existe)", r.status !== 201);

  console.log("\n==== CASO 4: INICIALIZAR SISTEMA ====");
  r = await req("POST", "/setup/initialize", {
    company: { legalName: "OmniStore Retail Solutions S.A.", commercialName: "OmniStore Pro", taxId: "900.452.123-0", email: "admin@omnistore.com", phone: "0999999999", mainAddress: "Av. Principal 123, Quito" },
    regionalConfig: { baseCurrency: "USD", timezone: "America/Guayaquil", dateFormat: "DD/MM/YYYY", decimalSeparator: ".", thousandSeparator: ",", language: "es", country: "Ecuador" },
    mainBranch: { code: "SKL-UIO-01", name: "Sede Principal - Quito", address: "Av. Amazonas", city: "Quito", country: "Ecuador" },
    taxes: [
      { name: "IVA General", rate: 15, isDefault: true, appliesTo: "BOTH" },
      { name: "Exento", rate: 0, isDefault: false, appliesTo: "BOTH" },
    ],
    billingConfig: { includeTaxInPrice: false, autoGenerateInvoiceNumber: true, allowInvoiceWithoutResolution: true },
    invoiceResolution: { prefix: "FAC", startNumber: 1, endNumber: 10000, currentNumber: 1, authorizationCode: "RES-001", validFrom: "2026-01-01", validUntil: "2026-12-31" },
  }, token);
  assert("Setup retorna 201", r.status === 201);
  assert("Company creada", r.data.data.company?.legalName?.includes("OmniStore"));

  console.log("\n==== CASO 5: SETUP STATUS (INICIALIZADO) ====");
  r = await req("GET", "/setup/status");
  assert("isInitialized = true", r.data.data.isInitialized === true);
  assert("nextStep = COMPLETED", r.data.data.nextStep === "COMPLETED");

  // Refresh token (user was updated with companyId)
  r = await req("POST", "/auth/login", { email: "admin@tienda.com", password: "Admin123!" });
  token = r.data.data.token;

  console.log("\n==== CASO 6: COMPANY CRUD ====");
  r = await req("GET", "/company/me", undefined, token);
  assert("GET /company/me → 200", r.status === 200);
  assert("Retorna empresa", r.data.data.legalName?.includes("OmniStore"));
  assert("Incluye regionalConfig", r.data.data.regionalConfig !== undefined);
  assert("Incluye billingConfig", r.data.data.billingConfig !== undefined);

  r = await req("PUT", "/company/me", { commercialName: "OmniStore Updated" }, token);
  assert("PUT /company/me actualiza", r.data.data.commercialName?.includes("Updated"));

  console.log("\n==== CASO 7: BRANCHES CRUD ====");
  r = await req("GET", "/branches", undefined, token);
  assert("Lista sucursales → 200", r.status === 200);
  const branches = r.data.data;
  assert("Sucursal principal existe", branches?.some((b: any) => b.isMain));
  const mainBranchId = branches?.find((b: any) => b.isMain)?.id;

  r = await req("POST", "/branches", { code: "SKL-GYE-01", name: "Guayaquil", city: "Guayaquil", country: "Ecuador", isMain: false }, token);
  assert("Sucursal secundaria creada → 201", r.status === 201);

  r = await req("PATCH", `/branches/${mainBranchId}/set-main`, undefined, token);
  assert("Set-main funciona", r.status === 200);

  console.log("\n==== CASO 8: TAXES CRUD ====");
  r = await req("GET", "/taxes", undefined, token);
  assert("Lista impuestos → 200", r.status === 200);
  assert("IVA General existe", r.data.data?.some((t: any) => t.name === "IVA General"));

  r = await req("GET", "/taxes/default", undefined, token);
  assert("Default tax obtenido", r.status === 200);
  assert("Default es IVA General", r.data.data?.name === "IVA General");

  r = await req("POST", "/taxes", { name: "ICE", rate: 10, appliesTo: "SALE" }, token);
  assert("Nuevo impuesto creado → 201", r.status === 201);

  const defaultTaxId = r.data.data?.id;

  r = await req("PATCH", `/taxes/${defaultTaxId}/set-default`, undefined, token);
  assert("Set-default funciona", r.status === 200);

  // Reset default back
  const taxes = (await req("GET", "/taxes", undefined, token)).data.data;
  const ivaGeneral = taxes?.find((t: any) => t.name === "IVA General");
  if (ivaGeneral) {
    await req("PATCH", `/taxes/${ivaGeneral.id}/set-default`, undefined, token);
  }

  console.log("\n==== CASO 9: BILLING CONFIG ====");
  r = await req("GET", "/billing/config", undefined, token);
  assert("Config facturación obtenida", r.status === 200);
  assert("includeTaxInPrice existe", "includeTaxInPrice" in (r.data.data || {}));

  r = await req("PUT", "/billing/config", { includeTaxInPrice: true, invoiceFooterText: "Gracias" }, token);
  assert("includeTaxInPrice actualizado", r.data.data?.includeTaxInPrice === true);

  // Reset to false for next test
  await req("PUT", "/billing/config", { includeTaxInPrice: false }, token);

  console.log("\n==== CASO 10: INVOICE RESOLUTIONS ====");
  r = await req("GET", "/billing/resolutions", undefined, token);
  assert("Resoluciones listadas", r.status === 200);
  assert("Resolución FAC existe", r.data.data?.some((res: any) => res.prefix === "FAC"));

  r = await req("GET", "/billing/next-invoice-number", undefined, token);
  assert("Next invoice number generado", r.status === 200);
  assert("Formato FAC-xxxxxxx", r.data.data?.fullInvoiceNumber?.startsWith("FAC-"));

  console.log("\n==== CASO 11: CREAR PRODUCTO CON TAX ====");
  // Create category and provider first
  r = await req("POST", "/categories", { name: "Bebidas" }, token);
  assert("Categoría creada", r.status === 201);
  const catId = (await req("GET", "/categories", undefined, token)).data.data?.find((c: any) => c.name === "Bebidas")?.id;

  r = await req("POST", "/providers", { name: "Distribuidora Test" }, token);
  assert("Proveedor creado", r.status === 201);
  const provId = (await req("GET", "/providers", undefined, token)).data.data?.find((p: any) => p.name === "Distribuidora Test")?.id;

  const taxId = (await req("GET", "/taxes/default", undefined, token)).data.data?.id;

  r = await req("POST", "/products", { code: "TEST-001", name: "Agua Test 500ml", categoryId: catId, providerId: provId, purchasePrice: 0.25, salePrice: 0.50, stock: 100, taxId }, token);
  assert("Producto creado con taxId", r.status === 201);
  const prodId = r.data.data?.id;

  console.log("\n==== CASO 12: VENTA CON IVA 15% ====");
  // Create default client
  await req("POST", "/clients", { name: "Consumidor Final", documentId: "9999999999" }, token);
  r = await req("POST", "/sales", { details: [{ productId: prodId, quantity: 2 }], paymentMethod: "EFECTIVO", discount: 0 }, token);
  assert("Venta creada", r.status === 201);
  const sale = r.data.data;
  assert("Total calculado correcto", Math.abs(sale.total - 1.15) < 0.01);
  assert("Tax calculado (IVA 15%)", Math.abs(sale.tax - 0.15) < 0.01);
  assert("Subtotal correcto", Math.abs(sale.subtotal - 1.00) < 0.01);

  console.log("\n==== CASO 13: includeTaxInPrice = true ====");
  await req("PUT", "/billing/config", { includeTaxInPrice: true }, token);
  r = await req("POST", "/sales", { details: [{ productId: prodId, quantity: 2 }], paymentMethod: "EFECTIVO" }, token);
  assert("Venta con includeTaxInPrice=true", r.status === 201);
  // 2 x 0.50 = 1.00 includes 15% IVA: subtotal = 0.87(rounded), tax = 0.13, total = 1.00
  const sale2 = r.data.data;
  assert("Total = precio con impuesto incluido", Math.abs(sale2.total - 1.00) < 0.01);

  // Reset billing config
  await req("PUT", "/billing/config", { includeTaxInPrice: false }, token);

  console.log("\n==== CASO 14: COMPRA CON EMPRESA/SUCURSAL ====");
  r = await req("POST", "/purchases", { providerId: provId, details: [{ productId: prodId, quantity: 10, unitCost: 0.20 }] }, token);
  assert("Compra creada → 201", r.status === 201);

  console.log("\n==== CASO 15: RE-INITIALIZE BLOQUEADO ====");
  r = await req("POST", "/setup/initialize", {
    company: { legalName: "X", commercialName: "X", taxId: "X", email: "x@x.com" },
    mainBranch: { code: "X", name: "X" },
    taxes: [{ name: "X", rate: 1, appliesTo: "BOTH" }],
    regionalConfig: {},
    billingConfig: {},
  }, token);
  assert("Re-initialize bloqueado → 400", r.status === 400);

  console.log("\n==== CASO 16: ELIMINAR IMPUESTO DEFAULT BLOQUEADO ====");
  if (ivaGeneral) {
    r = await req("DELETE", `/taxes/${ivaGeneral.id}`, undefined, token);
    assert("No permite eliminar impuesto default activo", r.status !== 200);
  }

  console.log("\n==== RESUMEN ====");
  console.log(`Total: ${pass + fail}`);
  console.log(`Pasadas: ${pass}`);
  console.log(`Fallidas: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("Error:", e); process.exit(1); });