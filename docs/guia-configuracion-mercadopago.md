# Guía de configuración — Mercado Pago

**Proyecto:** FerroSan E-commerce  
**URL producción:** https://ferreteria-ecommerce-psi.vercel.app  
**Documento para:** Mantenimiento y operación de la aplicación  
**Última actualización:** Mayo 2026  

---

## 1. Resumen

Esta guía explica cómo habilitar y mantener los pagos con **Mercado Pago** en la tienda online FerroSan. La configuración se realiza desde el panel de administración; las credenciales se guardan en la base de datos (tabla `settings`), no en el código fuente.

**Ubicación en el admin:** Admin → **Integraciones** → sección **Mercado Pago**  
**URL directa:** https://ferreteria-ecommerce-psi.vercel.app/admin/integraciones?section=mercadopago  

*(La ruta antigua `/admin/mercado-pago` redirige automáticamente a Integraciones.)*

---

## 2. Qué hace la integración

Cuando un cliente elige **Mercado Pago** en el checkout (`/checkout/pago`):

1. Se crea el pedido en la base de datos (estado `PENDING`, método `MERCADO_PAGO`).
2. Se descuenta el stock de los productos.
3. Se abre un **modal** con el formulario de pago de Mercado Pago (Payment Brick).
4. El cliente paga con tarjeta, débito o dinero en cuenta.
5. Si el pago se aprueba, el pedido pasa a **`PAYMENT_APPROVED`** y el cliente ve la página de éxito.
6. Mercado Pago envía una **notificación (webhook)** al sitio para confirmar o actualizar el estado del pago, incluso si el cliente cierra el navegador antes de volver.

---

## 3. Requisitos previos

### 3.1 Cuenta de Mercado Pago

- Cuenta de vendedor en [Mercado Pago Argentina](https://www.mercadopago.com.ar/).
- Para cobros reales, la cuenta debe estar **verificada** y habilitada para recibir pagos.

### 3.2 Variable de entorno en Vercel (crítica)

En **Vercel** → proyecto `ferreteria-ecommerce` → **Settings → Environment Variables**:

| Variable | Valor (producción) |
|----------|-------------------|
| `NEXT_PUBLIC_APP_URL` | `https://ferreteria-ecommerce-psi.vercel.app` |

Esta variable define la URL usada para:

- Redirecciones después del pago (éxito / fallo).
- URL del webhook que Mercado Pago debe llamar.

**Sin esta variable**, el sistema puede usar una URL interna de Vercel y las notificaciones de pago pueden fallar.

### 3.3 Acceso al panel admin

Solo usuarios con rol **ADMIN** o **SUPER_ADMIN** pueden acceder a Integraciones y configurar Mercado Pago.

---

## 4. Crear la aplicación en Mercado Pago Developers

### Paso 1 — Acceder al panel

1. Ingresar a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app).
2. Iniciar sesión con la cuenta del vendedor.

### Paso 2 — Crear aplicación

1. Crear una **nueva aplicación** (ejemplo: “FerroSan Tienda”).
2. Seleccionar integración de pagos online (Checkout / pagos en sitio web).

### Paso 3 — Obtener credenciales

En la aplicación creada, copiar:

| Credencial | Uso | Dónde se guarda en FerroSan |
|------------|-----|---------------------------|
| **Public Key** | Formulario de pago en el navegador del cliente | Integraciones → Mercado Pago → Public Key |
| **Access Token** | Crear preferencias y procesar pagos (solo servidor) | Integraciones → Mercado Pago → Access Token |

> **Importante:** El Access Token es **secreto**. No compartirlo por email, chat ni repositorios públicos.

### Modo prueba vs producción

Mercado Pago entrega **dos juegos de credenciales**:

| Modo | Prefijo típico | Uso |
|------|----------------|-----|
| **Prueba (sandbox)** | `TEST-` | Probar pagos sin dinero real |
| **Producción** | `APP_USR-` | Cobros reales a clientes |

**Regla:** Public Key y Access Token deben ser del **mismo entorno** (ambos TEST o ambos producción).

En Integraciones → Mercado Pago:

- **Modo prueba (sandbox)** = ON → usar credenciales `TEST-`.
- **Modo prueba (sandbox)** = OFF → usar credenciales `APP_USR-` de producción.

### Usuarios de prueba (sandbox)

En Developers → **Cuentas de prueba**, crear:

- Un usuario **vendedor** (seller).
- Un usuario **comprador** (buyer).

Usar el comprador de prueba y las tarjetas de test documentadas por Mercado Pago para simular pagos.

Documentación oficial: https://www.mercadopago.com.ar/developers/es/docs

---

## 5. Configurar en Admin → Integraciones → Mercado Pago

### Paso 1 — Abrir la sección

1. Ir a https://ferreteria-ecommerce-psi.vercel.app/admin/integraciones
2. Expandir la sección **Mercado Pago** (icono tarjeta, color celeste).

### Paso 2 — Completar campos

| Campo | Descripción |
|-------|-------------|
| **Habilitar Mercado Pago en checkout** | Activar para que los clientes vean la opción de pago |
| **Modo prueba (sandbox)** | ON si se usan credenciales TEST; OFF en producción |
| **Public Key** | Clave pública de la aplicación MP |
| **Access Token** | Token privado de la aplicación MP |

### Paso 3 — Guardar

1. Clic en **Guardar**.
2. Si el Access Token ya estaba guardado y no se desea cambiarlo, dejar el campo **vacío** al guardar (se mantiene el anterior).

### Paso 4 — Verificar webhook en pantalla

La misma sección muestra la **URL de notificaciones (webhook)**. Debe ser:

```
https://ferreteria-ecommerce-psi.vercel.app/api/webhooks/mercadopago
```

Copiar esta URL para configurarla en Mercado Pago Developers.

---

## 6. Configurar el webhook en Mercado Pago

El webhook permite que Mercado Pago avise al sitio cuando un pago cambia de estado (aprobado, rechazado, pendiente).

### Pasos en Mercado Pago Developers

1. Abrir la aplicación creada.
2. Ir a **Webhooks** / **Notificaciones IPN**.
3. Agregar la URL:
   ```
   https://ferreteria-ecommerce-psi.vercel.app/api/webhooks/mercadopago
   ```
4. Suscribir al evento **`payment`** (pagos).

### Comportamiento en FerroSan

| Estado MP | Acción en el pedido |
|-----------|---------------------|
| `approved` | Pedido → `PAYMENT_APPROVED` |
| `pending` / `in_process` | Se actualiza `paymentStatus`; pedido sigue pendiente |
| `rejected` / `cancelled` | Pedido → `CANCELLED`; se **restaura el stock** |

---

## 7. Procedimiento de prueba

### 7.1 Verificar que la opción aparece en checkout

1. Agregar productos al carrito.
2. Completar pasos **Datos** y **Envío**.
3. En **Pago**, verificar que **Mercado Pago** está habilitado (sin badge “Sin configurar”).

Si aparece “Sin configurar”, revisar:

- Habilitar Mercado Pago = ON
- Public Key cargada
- Access Token guardado

### 7.2 Pago de prueba (sandbox)

1. Modo prueba ON + credenciales `TEST-`.
2. Elegir Mercado Pago → **Pagar con Mercado Pago**.
3. Completar pago en el modal con usuario/tarjeta de prueba.
4. Confirmar redirección a `/checkout/exito`.
5. En **Admin → Ventas**, verificar pedido con pago aprobado.

### 7.3 Pasar a producción

1. Reemplazar credenciales por las de producción (`APP_USR-`).
2. Desactivar **Modo prueba (sandbox)**.
3. Confirmar webhook apuntando a la URL de producción.
4. Realizar una compra real de monto bajo para validar.

---

## 8. Errores frecuentes y soluciones

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Opción MP “Sin configurar” | Falta Public Key, Access Token o MP deshabilitado | Completar Integraciones → Mercado Pago |
| Modal no carga / error al pagar | Public Key incorrecta o mezcla TEST/APP_USR | Usar par del mismo entorno |
| Pago OK pero pedido sigue pendiente | Webhook mal configurado | Verificar URL y evento `payment` en MP |
| Webhook con URL incorrecta | Falta `NEXT_PUBLIC_APP_URL` en Vercel | Configurar variable y redeploy |
| Pago rechazado en prueba | Tarjeta/usuario de test incorrecto | Usar datos oficiales de prueba de MP |
| Token no se actualiza | Campo Access Token vacío al guardar | Pegar token nuevo explícitamente |

---

## 9. Referencia técnica (mantenimiento)

### Rutas y APIs relevantes

| Recurso | Ruta |
|---------|------|
| Config admin (UI) | `/admin/integraciones` (sección Mercado Pago) |
| API config admin | `GET/PUT /api/admin/mercadopago` |
| Config pública checkout | `GET /api/checkout/mercadopago/config` |
| Crear pedido + preferencia | `POST /api/checkout/mercadopago/create` |
| Procesar pago (brick) | `POST /api/checkout/mercadopago/process` |
| Webhook MP | `POST /api/webhooks/mercadopago` |

### Claves en base de datos (`settings`)

| Clave | Descripción |
|-------|-------------|
| `mercadopago_enabled` | `true` / `false` |
| `mercadopago_public_key` | Public Key |
| `mercadopago_access_token` | Access Token (secreto) |
| `mercadopago_sandbox` | `true` / `false` |

### Deploy

Desde la carpeta del proyecto:

```bash
npm run deploy:prod
```

Producción: https://ferreteria-ecommerce-psi.vercel.app

---

## 10. Checklist de configuración

- [ ] Cuenta Mercado Pago verificada (producción)
- [ ] Aplicación creada en Mercado Pago Developers
- [ ] Public Key y Access Token cargados en Integraciones → Mercado Pago
- [ ] “Habilitar Mercado Pago en checkout” = ON
- [ ] Modo prueba acorde a credenciales (TEST vs APP_USR)
- [ ] `NEXT_PUBLIC_APP_URL` configurada en Vercel
- [ ] Webhook configurado en MP con URL de producción
- [ ] Evento `payment` suscrito
- [ ] Prueba de compra en sandbox completada
- [ ] Cambio a credenciales de producción cuando corresponda

---

## 11. Contactos y enlaces útiles

| Recurso | URL |
|---------|-----|
| Tienda (producción) | https://ferreteria-ecommerce-psi.vercel.app |
| Admin Integraciones | https://ferreteria-ecommerce-psi.vercel.app/admin/integraciones |
| Mercado Pago Developers | https://www.mercadopago.com.ar/developers/panel/app |
| Documentación MP | https://www.mercadopago.com.ar/developers/es/docs |
| Panel Vercel | https://vercel.com |

---

*Documento generado para el equipo de mantenimiento de FerroSan E-commerce.*
