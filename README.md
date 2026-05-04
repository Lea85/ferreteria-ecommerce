# FerroSan — E-Commerce para Ferretería y Casa de Sanitarios

Plataforma de e-commerce completa para ferretería y casa de sanitarios, con soporte B2C y B2B (gremios/mayoristas), sistema de precios dinámicos y adaptada al mercado argentino.

## Stack Tecnológico

- **Frontend/Backend**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui + Lucide Icons
- **Base de datos**: PostgreSQL (Supabase)
- **ORM**: Prisma 7
- **Auth**: Auth.js v5 (Credentials + Google OAuth)
- **Estado**: Zustand (carrito) + TanStack Query
- **Pagos**: Mercado Pago (configuración pendiente)
- **Deploy**: Vercel

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Generar cliente Prisma
npx prisma generate

# Crear tablas en Supabase
npx prisma db push

# Cargar datos de ejemplo
npx tsx prisma/seed.ts

# Iniciar desarrollo
npm run dev
```

## Flujo Local -> Producción (GitHub + Vercel + Supabase)

1. Linkear este repo con tu proyecto de Vercel (una sola vez):

```bash
npm run vercel:link
```

2. Traer variables de producción de Vercel al entorno local:

```bash
npm run vercel:pull
```

3. Verificar que `.env.local` tenga valores correctos para:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (en local: `http://localhost:3000`)

4. Aplicar cambios de base (si modificaste schema Prisma):

```bash
npm run db:push
```

5. Trabajar localmente:

```bash
npm run dev
```

6. Publicar:

- Si Vercel despliega por GitHub, solo hace falta `git push`.
- Si querés desplegar directo desde tu máquina:

```bash
npm run deploy:prod
```

## Usuarios de Prueba (después del seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@ferrosan.com | admin123 |
| Consumidor | juan@example.com | user123 |
| Gremio | carlos.plomero@example.com | user123 |
| Mayorista | constructora@example.com | user123 |

## Variables de Entorno

Ver `.env.example` para la lista completa. Las mínimas necesarias:

- `DATABASE_URL` — Connection string de Supabase (pooler, modo Transaction)
- `DIRECT_URL` — Connection string directa de Supabase (para migraciones)
- `AUTH_SECRET` — Secreto para Auth.js

## Estructura del Proyecto

```
src/
├── app/
│   ├── (storefront)/    # Tienda pública (home, productos, carrito, checkout)
│   ├── (admin)/         # Panel de administración
│   ├── (auth)/          # Login y registro
│   ├── (checkout)/      # Proceso de compra
│   └── api/             # API routes (auth, webhooks)
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   ├── storefront/      # Componentes de la tienda
│   └── admin/           # Componentes del admin
├── lib/
│   ├── services/        # Lógica de negocio (pricing, stock, orders)
│   ├── validators/      # Schemas Zod
│   ├── auth.ts          # Configuración Auth.js
│   ├── db.ts            # Cliente Prisma
│   └── constants.ts     # Constantes y labels
├── stores/              # Zustand stores (carrito)
└── types/               # TypeScript types
```
