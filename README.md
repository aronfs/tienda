# Sistema de Gestión de Tienda - API REST (Multiempresa)

Backend multiempresa con aislamiento completo de datos por empresa y sucursal.

## Stack

- **Runtime:** Bun
- **Lenguaje:** TypeScript
- **Framework:** Express
- **ORM:** Prisma
- **Base de datos:** PostgreSQL
- **Autenticación:** JWT + bcrypt
- **Validaciones:** Zod

## Requisitos

- [Bun](https://bun.sh) >= 1.0
- [PostgreSQL](https://www.postgresql.org) >= 14

## Instalación

```bash
git clone <repo-url>
cd tienda-backend
bun install
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

## Base de datos

```bash
bun run prisma:generate
bun run prisma:migrate -- --name init
bun run prisma:seed
bun run prisma:studio
```

## Ejecución

```bash
bun run dev   # Desarrollo con hot reload
bun run start # Producción
```

Servidor en `http://localhost:3000`.

---

## REGLAS MULTIEMPRESA (CRÍTICO)

Este sistema implementa **aislamiento multiempresa estricto**.

### Principio fundamental

```
Cada empresa solo ve, crea, edita y opera sus propios datos.
```

### Columnas de aislamiento

| Columna | Dónde se usa |
|---------|-------------|
| `companyId` | Toda tabla operativa: Product, Category, Provider, Client, Sale, Purchase, InventoryMovement, CashRegister, CashMovement, Return, AuditLog |
| `branchId` | Sale, Purchase, InventoryMovement, CashRegister, CashMovement, Return |

### Reglas

1. **companyId se toma del JWT**, nunca del body de la request.
2. **findMany/findFirst siempre filtran por companyId**.
3. **create asigna companyId automáticamente** desde el token.
4. **update/delete validan que el registro pertenezca a companyId**.
5. **Categorías, proveedores, clientes** tienen `@@unique([companyId, name])`.
6. **Productos** tienen `@@unique([companyId, code])` y `@@unique([companyId, barcode])`.
7. **Ventas/Compras validan** que productos, clientes y proveedores sean de la misma empresa.
8. **Caja abierta** es única por `userId + companyId + branchId + status=ABIERTA`.
9. **Dashboard, Analytics, Reportes** filtran por `companyId`.
10. **Seed multiempresa** crea datos separados por empresa.

### Middlewares

- `requireCompany` - Bloquea si el usuario no tiene empresa asignada.
- `requireBranch` - Bloquea si el usuario no tiene sucursal asignada.
- Ambos se aplican automáticamente en todas las rutas protegidas.

---

## Datos de prueba (Seed Multiempresa)

### Empresa 1: TechNova Store

| Rol | Email | Password |
|-----|-------|----------|
| Administrador | admin@technova.com | Admin123! |
| Cajero | cajero@technova.com | Cajero123! |
| Bodeguero | bodega@technova.com | Bodega123! |

Productos: Laptop, MacBook, Samsung Galaxy, Mouse, Teclado, Cable USB-C.

### Empresa 2: MiniMarket San José

| Rol | Email | Password |
|-----|-------|----------|
| Administrador | admin@minimarket.com | Admin123! |
| Cajero | cajero@minimarket.com | Cajero123! |
| Bodeguero | bodega@minimarket.com | Bodega123! |

Productos: Agua, Coca-Cola, Arroz, Leche, Detergente, Papas.

---

## Scripts de auditoría

```bash
# Auditar datos multiempresa
bun scripts/audit-multitenancy.ts

# Corregir (solo después de auditar y revisar)
bun scripts/fix-multitenancy.ts
```

---

## QA Multiempresa (Bruno)

Carpeta `bruno/QA Multiempresa/` contiene 17 requests para validar:
- Login con companyId/branchId en JWT
- Aislamiento de productos, clientes, inventario
- Bloqueo de ventas cross-company
- Dashboard y analytics separados

---

## Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Setup
- `GET /api/setup/status`
- `POST /api/setup/initialize`

### Empresa
- `GET /api/company`
- `PUT /api/company`

### Sucursales
- `GET /api/branches`
- `POST /api/branches`
- `PUT /api/branches/:id`
- `DELETE /api/branches/:id`

### Categorías
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `PATCH /api/categories/:id/deactivate`

### Productos
- `GET /api/products`
- `GET /api/products/low-stock`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `PATCH /api/products/:id/deactivate`

### Proveedores
- `GET /api/providers`
- `POST /api/providers`
- `PUT /api/providers/:id`
- `PATCH /api/providers/:id/deactivate`

### Clientes
- `GET /api/clients`
- `POST /api/clients`
- `PUT /api/clients/:id`

### Compras
- `GET /api/purchases`
- `GET /api/purchases/:id`
- `POST /api/purchases`

### Ventas
- `GET /api/sales`
- `GET /api/sales/:id`
- `POST /api/sales`
- `PATCH /api/sales/:id/cancel`

### Inventario
- `GET /api/inventory/movements`
- `POST /api/inventory/adjust`

### Caja
- `POST /api/cash-register/open`
- `POST /api/cash-register/close`
- `GET /api/cash-register/current`
- `GET /api/cash-register/history`

### Devoluciones
- `GET /api/returns`
- `POST /api/returns`

### Dashboard
- `GET /api/dashboard/summary`

### Analytics
- `GET /api/analytics/dashboard`
- `GET /api/analytics/sales`
- `GET /api/analytics/revenue`
- `GET /api/analytics/purchases`
- `GET /api/analytics/products`
- `GET /api/analytics/categories`
- `GET /api/analytics/clients`
- `GET /api/analytics/providers`
- `GET /api/analytics/inventory`
- `GET /api/analytics/cash`
- Charts y reportes

### Facturación
- `GET /api/billing`
- `PUT /api/billing`

### Impuestos
- `GET /api/taxes`
- `POST /api/taxes`
- `PUT /api/taxes/:id`
- `DELETE /api/taxes/:id`

### Auditoría
- `GET /api/audit`
