# Sistema de Gestión de Tienda - API REST

Backend completo para administrar una tienda con autenticación, roles, productos, ventas, compras, inventario, caja y más.

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
# Clonar el repositorio
git clone <repo-url>
cd tienda-backend

# Instalar dependencias
bun install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

## Base de datos

```bash
# Generar cliente Prisma
bun run prisma:generate

# Ejecutar migración inicial
bun run prisma:migrate -- --name init

# Poblar base de datos con datos de prueba
bun run prisma:seed

# (Opcional) Abrir Prisma Studio para ver datos
bun run prisma:studio
```

## Ejecución

```bash
# Desarrollo con hot reload
bun run dev

# Producción
bun run start
```

El servidor iniciará en `http://localhost:3000`.

## Datos de prueba

### Usuarios

| Rol | Email | Password |
|-----|-------|----------|
| Administrador | admin@tienda.com | Admin123! |
| Cajero | cajero@tienda.com | Cajero123! |
| Bodeguero | bodega@tienda.com | Bodega123! |

## Ejemplos de uso

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@tienda.com",
  "password": "Admin123!"
}
```

Respuesta:
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "Administrador Principal",
      "email": "admin@tienda.com",
      "role": { "id": 1, "name": "ADMINISTRADOR" }
    }
  }
}
```

### Crear producto (requiere token)

```bash
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "PROD-007",
  "name": "Galletas 200g",
  "categoryId": 5,
  "providerId": 1,
  "purchasePrice": 0.50,
  "salePrice": 0.85,
  "stock": 100,
  "minStock": 10
}
```

### Crear compra (requiere token)

```bash
POST /api/purchases
Authorization: Bearer <token>
Content-Type: application/json

{
  "providerId": 1,
  "details": [
    {
      "productId": 1,
      "quantity": 50,
      "unitCost": 0.25
    },
    {
      "productId": 2,
      "quantity": 30,
      "unitCost": 0.80
    }
  ]
}
```

### Crear venta (requiere token)

```bash
POST /api/sales
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": 1,
  "paymentMethod": "EFECTIVO",
  "details": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 3,
      "quantity": 1
    }
  ]
}
```

### Abrir caja (requiere token)

```bash
POST /api/cash-register/open
Authorization: Bearer <token>
Content-Type: application/json

{
  "initialAmount": 50
}
```

## Endpoints

### Auth
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener perfil actual

### Usuarios (requiere users:manage)
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `PATCH /api/users/:id/deactivate` - Desactivar usuario

### Roles
- `GET /api/roles` - Listar roles con permisos

### Categorías
- `GET /api/categories` - Listar categorías
- `POST /api/categories` - Crear categoría
- `PUT /api/categories/:id` - Actualizar categoría
- `PATCH /api/categories/:id/deactivate` - Desactivar categoría

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/low-stock` - Productos con bajo stock
- `GET /api/products/:id` - Obtener producto
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `PATCH /api/products/:id/deactivate` - Desactivar producto

### Proveedores
- `GET /api/providers` - Listar proveedores
- `POST /api/providers` - Crear proveedor
- `PUT /api/providers/:id` - Actualizar proveedor
- `PATCH /api/providers/:id/deactivate` - Desactivar proveedor

### Clientes
- `GET /api/clients` - Listar clientes
- `POST /api/clients` - Crear cliente
- `PUT /api/clients/:id` - Actualizar cliente

### Compras
- `GET /api/purchases` - Listar compras
- `GET /api/purchases/:id` - Obtener compra
- `POST /api/purchases` - Crear compra (aumenta stock)

### Ventas
- `GET /api/sales` - Listar ventas
- `GET /api/sales/:id` - Obtener venta
- `POST /api/sales` - Crear venta (descuenta stock)
- `PATCH /api/sales/:id/cancel` - Anular venta (restaura stock)

### Inventario
- `GET /api/inventory/movements` - Movimientos de inventario
- `POST /api/inventory/adjust` - Ajustar inventario

### Caja
- `POST /api/cash-register/open` - Abrir caja
- `POST /api/cash-register/close` - Cerrar caja
- `GET /api/cash-register/current` - Caja actual del usuario
- `GET /api/cash-register/history` - Historial de cajas

### Devoluciones
- `GET /api/returns` - Listar devoluciones
- `POST /api/returns` - Crear devolución (restaura stock)

### Dashboard
- `GET /api/dashboard/summary` - Resumen del dashboard

### Configuración
- `GET /api/config` - Obtener configuración
- `PUT /api/config` - Actualizar configuración

### Auditoría
- `GET /api/audit` - Ver registros de auditoría
