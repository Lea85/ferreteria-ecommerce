# Arquitectura del Sistema — Ferretería & Casa de Sanitarios (E-Commerce)

## Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Arquitectura General](#2-arquitectura-general)
3. [Esquema de Base de Datos](#3-esquema-de-base-de-datos)
4. [Modelo de Precios y Descuentos](#4-modelo-de-precios-y-descuentos)
5. [Estructura del Proyecto](#5-estructura-del-proyecto)
6. [Integraciones Externas](#6-integraciones-externas)
7. [Decisiones de Diseño](#7-decisiones-de-diseño)

---

## 1. Stack Tecnológico

### Frontend + Backend (Fullstack)

| Tecnología | Versión | Justificación |
|---|---|---|
| **Next.js** | 15 (App Router) | Framework fullstack React. SSR/SSG para SEO, Server Actions para mutaciones, desplegable en Vercel nativamente. |
| **React** | 19 | UI declarativa con Server Components para rendimiento óptimo. |
| **TypeScript** | 5.x | Tipado estricto = menos bugs en lógica de precios y reglas de negocio complejas. |
| **Tailwind CSS** | 4.x | Utility-first, perfecto para diseño Mobile-First responsive. |
| **shadcn/ui** | latest | Componentes accesibles basados en Radix UI, personalizables sin dependencia pesada. |

### Estado y Data Fetching

| Tecnología | Uso |
|---|---|
| **TanStack Query (React Query)** | Cache de datos del servidor, invalidación inteligente, estados de carga. |
| **Zustand** | Estado global liviano (carrito, UI state). Persiste carrito en localStorage. |
| **nuqs** | Sincronización de filtros/búsqueda con query params (URLs compartibles y SEO). |

### Base de Datos y ORM

| Tecnología | Justificación |
|---|---|
| **PostgreSQL** (via **Neon** o **Supabase**) | BD relacional robusta. Neon es serverless PostgreSQL optimizado para Vercel (branching, auto-scaling, cold starts rápidos). |
| **Prisma ORM** | Type-safe queries, migraciones declarativas, excelente DX con TypeScript. |
| **Upstash Redis** | Cache serverless para sesiones, carrito persistente y rate limiting. Compatible con Vercel Edge. |

### Búsqueda

| Tecnología | Justificación |
|---|---|
| **Meilisearch** (self-hosted en Railway/Render) o **Algolia** (SaaS) | Búsqueda full-text con tolerancia a typos, filtros facetados, autocompletado. Meilisearch es open-source y más económico. Algolia es plug-and-play. |

### Autenticación

| Tecnología | Justificación |
|---|---|
| **Auth.js (NextAuth) v5** | Integración nativa con Next.js 15, soporte Credentials + Google OAuth, manejo de roles en JWT/session. |

### Almacenamiento de Imágenes

| Tecnología | Justificación |
|---|---|
| **Cloudinary** o **Vercel Blob** | Optimización automática de imágenes (WebP/AVIF), transformaciones on-the-fly, CDN global. |
| **next/image** | Componente de Next.js para lazy loading, responsive images y optimización automática. |

### Pagos (Argentina)

| Tecnología | Justificación |
|---|---|
| **Mercado Pago SDK** | Principal: Checkout Pro (redirect) + Checkout API (transparente) con soporte de cuotas. Domina el mercado argentino. |
| **Transferencia Bancaria** | Flujo manual: el cliente sube comprobante, admin valida. |

### Logística (Argentina)

| Tecnología | Justificación |
|---|---|
| **Andreani API** / **Correo Argentino API** | Cotización de envíos en tiempo real por código postal. |
| **Zippin** (opcional) | Plataforma que unifica múltiples carriers argentinos en una sola API. |

### Email Transaccional

| Tecnología | Justificación |
|---|---|
| **Resend** | API moderna para emails transaccionales. Integra con React Email para templates tipados. |
| **React Email** | Templates de email como componentes React (mantenibilidad). |

### Monitoreo y Analytics

| Tecnología | Justificación |
|---|---|
| **Vercel Analytics** | Web Vitals y métricas de rendimiento integradas. |
| **Sentry** | Error tracking en producción (frontend + backend). |
| **PostHog** (opcional) | Analytics de producto, funnels de conversión, carritos abandonados. |

### Infraestructura / Deploy

| Tecnología | Justificación |
|---|---|
| **Vercel** | Deploy automatizado, Edge Functions, preview deployments por PR. |
| **GitHub Actions** | CI/CD para tests, linting, y migraciones de BD. |

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Edge Network)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Next.js 15 (App Router)                 │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │   Storefront │  │  Admin Panel  │  │  API Routes    │  │   │
│  │  │   (SSR/SSG)  │  │  (CSR + Auth) │  │  /api/*        │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │   │
│  │         │                │                   │            │   │
│  │  ┌──────┴────────────────┴───────────────────┴────────┐  │   │
│  │  │              Server Actions / tRPC                   │  │   │
│  │  │         (Lógica de negocio type-safe)                │  │   │
│  │  └──────────────────────┬──────────────────────────────┘  │   │
│  └─────────────────────────┼─────────────────────────────────┘   │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐       ┌─────▼─────┐      ┌─────▼─────┐
    │  Neon    │       │  Upstash  │      │Meilisearch│
    │PostgreSQL│       │  Redis    │      │ (Search)  │
    │(Primary) │       │ (Cache)   │      │           │
    └─────────┘       └───────────┘      └───────────┘

         ┌───────────────────────────────────────┐
         │         Servicios Externos             │
         │                                        │
         │  ┌────────────┐  ┌──────────────────┐ │
         │  │ Mercado     │  │ Andreani / Zippin│ │
         │  │ Pago        │  │ (Logística)      │ │
         │  └────────────┘  └──────────────────┘ │
         │  ┌────────────┐  ┌──────────────────┐ │
         │  │ Cloudinary  │  │ Resend           │ │
         │  │ (Imágenes)  │  │ (Emails)         │ │
         │  └────────────┘  └──────────────────┘ │
         └───────────────────────────────────────┘
```

### Patrón de Arquitectura

- **Storefront (público)**: Renderizado con SSR/SSG para SEO. Categorías y productos estáticos se regeneran con ISR (Incremental Static Regeneration).
- **Admin Panel**: SPA protegida con autenticación, renderizada en cliente.
- **API Layer**: Server Actions de Next.js para mutaciones (carrito, checkout, CRUD). API Routes para webhooks (Mercado Pago, etc.).
- **Lógica de Negocio**: Centralizada en un service layer (`/lib/services/`) que encapsula las reglas de precios, descuentos y stock.

---

## 3. Esquema de Base de Datos

### 3.1 Diagrama Entidad-Relación (Resumen Visual)

```
┌──────────────┐     ┌────────────────┐     ┌───────────────────┐
│   Category   │────<│    Product      │────<│  ProductVariant   │
│              │     │                 │     │                   │
│ - id         │     │ - id            │     │ - id              │
│ - name       │     │ - name          │     │ - sku             │
│ - slug       │     │ - slug          │     │ - price           │
│ - parent_id  │     │ - description   │     │ - compare_price   │
│ - position   │     │ - brand_id      │     │ - stock           │
│ - image_url  │     │ - is_active     │     │ - attributes      │
│ - is_active  │     │ - is_featured   │     │ - images[]        │
└──────┬───────┘     │ - meta_title    │     │ - weight          │
       │             │ - meta_desc     │     │ - is_active       │
       │ (self-ref)  └────────┬────────┘     └─────────┬─────────┘
       └──(parent)            │                        │
                              │                        │
              ┌───────────────┼────────────────┐       │
              │               │                │       │
     ┌────────▼──────┐ ┌─────▼──────┐  ┌─────▼───────────────┐
     │ProductCategory│ │ProductImage│  │  PriceRule           │
     │(many-to-many) │ │            │  │                      │
     └───────────────┘ └────────────┘  │ - id                 │
                                       │ - name               │
                                       │ - type (ROLE/VOLUME/ │
  ┌────────────┐                       │         PROMO)       │
  │   Brand    │                       │ - customer_type      │
  │            │                       │ - min_quantity        │
  │ - id       │                       │ - discount_type      │
  │ - name     │                       │   (PERCENTAGE/FIXED) │
  │ - slug     │                       │ - discount_value     │
  │ - logo_url │                       │ - starts_at          │
  └────────────┘                       │ - ends_at            │
                                       │ - is_active          │
                                       │ - priority           │
  ┌────────────────┐                   └──────────────────────┘
  │     User       │                              │
  │                │                              │
  │ - id           │          ┌────────────────────┘
  │ - email        │          │
  │ - password     │   ┌──────▼──────────┐
  │ - name         │   │PriceRuleProduct │
  │ - customer_type│   │ (scope de regla)│
  │   (CONSUMER/   │   └─────────────────┘
  │    TRADE/      │
  │    WHOLESALE)  │
  │ - is_approved  │     ┌─────────────────┐
  │ - tax_id       │     │    Coupon        │
  └───────┬────────┘     │                  │
          │              │ - id             │
          │              │ - code           │
   ┌──────▼──────┐      │ - discount_type  │
   │   Order     │      │ - discount_value │
   │             │      │ - min_purchase   │
   │ - id        │      │ - max_uses       │
   │ - number    │      │ - used_count     │
   │ - status    │      │ - expires_at     │
   │ - subtotal  │      └─────────────────┘
   │ - discount  │
   │ - shipping  │
   │ - tax       │
   │ - total     │
   │ - coupon_id │
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │  OrderItem  │
   │             │
   │ - variant_id│
   │ - quantity  │
   │ - unit_price│
   │ - discount  │
   │ - total     │
   └─────────────┘
```

### 3.2 Definición Detallada de Entidades

A continuación, el schema completo en formato Prisma (que genera las migraciones SQL para PostgreSQL):

---

## 4. Modelo de Precios y Descuentos

### Problema Central

Un mismo producto puede tener **diferentes precios** según:
1. **Tipo de cliente** (Consumidor Final, Gremio/Instalador, Mayorista)
2. **Cantidad comprada** (descuento escalonado por volumen)
3. **Promociones temporales** (ofertas, 2x1, etc.)
4. **Cupones** (descuentos adicionales al final del carrito)

### Solución: Sistema de Price Rules (Reglas de Precio)

En lugar de almacenar múltiples precios por producto (que se vuelve inmanejable), usamos un sistema de **reglas de precio** con prioridad:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOTOR DE CÁLCULO DE PRECIO                    │
│                                                                  │
│  1. Precio Base (ProductVariant.price)                          │
│     └─ Es el precio de lista (consumidor final)                 │
│                                                                  │
│  2. Reglas por Tipo de Cliente (PriceRule.type = 'ROLE')        │
│     └─ Si usuario es TRADE → aplicar -15%                       │
│     └─ Si usuario es WHOLESALE → aplicar -25%                   │
│     └─ Se aplica ANTES de cualquier otra regla                  │
│                                                                  │
│  3. Reglas por Volumen (PriceRule.type = 'VOLUME')              │
│     └─ Si qty >= 10 → aplicar -10%                              │
│     └─ Si qty >= 50 → aplicar -20%                              │
│     └─ Se aplica sobre el precio ya ajustado por rol            │
│                                                                  │
│  4. Promociones (PriceRule.type = 'PROMO')                      │
│     └─ Si el producto está en promo activa → aplicar descuento  │
│     └─ Limitadas por fecha (starts_at / ends_at)                │
│     └─ NO acumulable con descuento por rol (se elige el mayor)  │
│                                                                  │
│  5. Cupón (Coupon) — Se aplica al TOTAL del carrito             │
│     └─ Último paso, post-cálculo de todos los ítems             │
│     └─ Validaciones: monto mínimo, fecha, usos restantes       │
│                                                                  │
│  RESULTADO: Precio Final por Ítem + Total del Carrito           │
└─────────────────────────────────────────────────────────────────┘
```

### Algoritmo de Resolución de Precio

```typescript
function calculateItemPrice(
  variant: ProductVariant,
  quantity: number,
  customerType: CustomerType,
  applicableRules: PriceRule[]
): { unitPrice: number; totalDiscount: number } {
  let basePrice = variant.price;
  let bestDiscount = 0;

  // Paso 1: Buscar descuento por ROL del cliente
  const roleRules = applicableRules
    .filter(r => r.type === 'ROLE' && r.customerType === customerType && r.isActive)
    .sort((a, b) => b.priority - a.priority);

  if (roleRules.length > 0) {
    bestDiscount = applyDiscount(basePrice, roleRules[0]);
  }

  // Paso 2: Buscar descuento por VOLUMEN
  const volumeRules = applicableRules
    .filter(r => r.type === 'VOLUME' && r.minQuantity <= quantity && r.isActive)
    .sort((a, b) => b.minQuantity - a.minQuantity); // la regla más restrictiva gana

  if (volumeRules.length > 0) {
    const volumeDiscount = applyDiscount(basePrice, volumeRules[0]);
    bestDiscount = Math.max(bestDiscount, volumeDiscount); // o acumular según regla de negocio
  }

  // Paso 3: Buscar PROMOCIONES activas (por fecha)
  const promoRules = applicableRules
    .filter(r => r.type === 'PROMO' && r.isActive && isWithinDates(r))
    .sort((a, b) => b.priority - a.priority);

  if (promoRules.length > 0) {
    const promoDiscount = applyDiscount(basePrice, promoRules[0]);
    bestDiscount = Math.max(bestDiscount, promoDiscount);
  }

  const finalPrice = basePrice - bestDiscount;
  return {
    unitPrice: Math.max(finalPrice, 0),
    totalDiscount: bestDiscount * quantity,
  };
}
```

### ¿Por qué este enfoque?

| Alternativa | Problema |
|---|---|
| Múltiples columnas de precio por producto (price_consumer, price_trade, etc.) | No escala. Agregar un nuevo tipo de cliente requiere alterar la tabla. |
| Tabla de precios fija por (producto × tipo_cliente) | Funciona, pero no soporta reglas por volumen ni temporales sin duplicación. |
| **Price Rules (elegido)** | Flexible: cualquier combinación de condiciones. Nuevas reglas sin alterar el schema. Sistema de prioridades resuelve conflictos. |

---

## 5. Estructura del Proyecto

```
ferreteria-ecommerce/
├── prisma/
│   ├── schema.prisma          # Schema de BD
│   ├── migrations/            # Migraciones SQL
│   └── seed.ts                # Datos semilla
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (storefront)/      # Grupo: tienda pública
│   │   │   ├── page.tsx                    # Home
│   │   │   ├── productos/
│   │   │   │   ├── [slug]/page.tsx         # Ficha de producto
│   │   │   │   └── page.tsx               # Listado con filtros
│   │   │   ├── categorias/
│   │   │   │   └── [...slug]/page.tsx     # Categoría con breadcrumb
│   │   │   ├── carrito/page.tsx           # Carrito
│   │   │   ├── checkout/
│   │   │   │   ├── datos/page.tsx         # Paso 1
│   │   │   │   ├── envio/page.tsx         # Paso 2
│   │   │   │   └── pago/page.tsx          # Paso 3
│   │   │   └── mi-cuenta/
│   │   │       ├── pedidos/page.tsx
│   │   │       ├── direcciones/page.tsx
│   │   │       ├── favoritos/page.tsx
│   │   │       └── perfil/page.tsx
│   │   ├── (admin)/           # Grupo: panel de administración
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── productos/
│   │   │   │   ├── categorias/
│   │   │   │   ├── pedidos/
│   │   │   │   ├── usuarios/
│   │   │   │   ├── cupones/
│   │   │   │   ├── promociones/
│   │   │   │   └── reportes/
│   │   ├── api/               # API Routes
│   │   │   ├── webhooks/
│   │   │   │   └── mercadopago/route.ts
│   │   │   ├── shipping/
│   │   │   │   └── quote/route.ts
│   │   │   └── search/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── storefront/        # Componentes de la tienda
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGallery.tsx
│   │   │   ├── CategoryTree.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FacetedFilters.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   └── CheckoutStepper.tsx
│   │   └── admin/             # Componentes del admin
│   │       ├── DataTable.tsx
│   │       ├── ProductForm.tsx
│   │       └── OrderStatusBadge.tsx
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # Auth.js config
│   │   ├── services/          # Lógica de negocio
│   │   │   ├── pricing.service.ts    # Motor de cálculo de precios
│   │   │   ├── cart.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── stock.service.ts
│   │   │   ├── shipping.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── search.service.ts
│   │   │   └── email.service.ts
│   │   ├── validators/        # Schemas Zod para validación
│   │   ├── utils/
│   │   └── constants.ts
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   │   └── cart.store.ts
│   └── types/                 # TypeScript types
├── public/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Integraciones Externas

### Mercado Pago

- **Checkout Pro**: Redirect al formulario de MP. Ideal para empezar.
- **Checkout API (transparente)**: Formulario de tarjeta embebido en el sitio.
- **Webhook**: `POST /api/webhooks/mercadopago` recibe notificaciones IPN de cambio de estado de pago.
- **Cuotas**: Consultar cuotas disponibles via API de MP para mostrar al usuario.

### Logística

- **Retiro en sucursal**: Sin costo, el pedido pasa a "Listo para retiro".
- **Flete propio**: Tabla de zonas/código postal con precios fijos configurables desde el admin.
- **Correo (Andreani/Zippin)**: API para cotizar en tiempo real según peso total del pedido y CP destino.

### Búsqueda (Meilisearch)

- Indexar productos con: nombre, SKU, descripción, marca, categorías, atributos.
- Configurar sinónimos (ej. "canilla" = "grifo" = "grifería").
- Filtros facetados por marca, precio, categoría, stock.

---

## 7. Decisiones de Diseño

### ¿Por qué Next.js fullstack en vez de backend separado?

| Factor | Next.js Fullstack | Backend separado (Nest/Express) |
|---|---|---|
| Complejidad de deploy | Un solo deploy en Vercel | Dos servicios (más infra) |
| SEO | SSR/SSG nativo | Necesita BFF o hydration manual |
| DX (Developer Experience) | Un solo repo, types compartidos | Necesita monorepo o API contracts |
| Escalabilidad | Serverless auto-scaling | Requiere configurar scaling |
| **Decisión** | **Para este proyecto, Next.js fullstack es ideal.** Si en el futuro se necesita un backend más complejo (microservicios, colas de trabajo), se puede extraer. ||

### ¿Por qué Neon PostgreSQL?

- **Serverless**: Compatible con el modelo de Vercel (funciones serverless).
- **Branching**: Permite crear "branches" de la BD para testing sin clonar datos.
- **Scale-to-zero**: No paga por inactividad en plan gratuito.
- **Connection pooling**: Integrado (PgBouncer), crucial para serverless.

### ¿Por qué Price Rules en vez de tabla de precios?

El modelo de reglas de precio (Price Rules) permite:
- Agregar nuevos tipos de descuento sin modificar el schema de BD.
- Combinar múltiples condiciones (rol + volumen + temporalidad).
- El admin puede crear reglas desde el panel sin intervención de desarrollo.
- Sistema de prioridades resuelve conflictos automáticamente.

---

> **Próximos pasos**: Implementar el schema de Prisma, configurar el proyecto Next.js e iniciar el desarrollo de los módulos core (catálogo, auth, pricing).
