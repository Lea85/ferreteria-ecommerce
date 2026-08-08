-- Devoluciones de ventas
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

CREATE TYPE "OrderReturnStatus" AS ENUM ('COMPLETED', 'CANCELLED');

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "quantityReturned" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "order_returns" (
  "id" TEXT NOT NULL,
  "returnNumber" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "OrderReturnStatus" NOT NULL DEFAULT 'COMPLETED',
  "refundMethod" "PaymentMethod" NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "processedById" TEXT,
  "processedByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "order_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "order_return_items" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "variantId" TEXT,
  "productName" TEXT NOT NULL,
  "variantName" TEXT,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,

  CONSTRAINT "order_return_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "order_returns_returnNumber_key" ON "order_returns"("returnNumber");
CREATE INDEX IF NOT EXISTS "order_returns_orderId_idx" ON "order_returns"("orderId");
CREATE INDEX IF NOT EXISTS "order_returns_returnNumber_idx" ON "order_returns"("returnNumber");
CREATE INDEX IF NOT EXISTS "order_returns_createdAt_idx" ON "order_returns"("createdAt");

CREATE INDEX IF NOT EXISTS "order_return_items_returnId_idx" ON "order_return_items"("returnId");
CREATE INDEX IF NOT EXISTS "order_return_items_orderItemId_idx" ON "order_return_items"("orderItemId");

ALTER TABLE "order_returns" DROP CONSTRAINT IF EXISTS "order_returns_orderId_fkey";
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_return_items" DROP CONSTRAINT IF EXISTS "order_return_items_returnId_fkey";
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_returnId_fkey"
  FOREIGN KEY ("returnId") REFERENCES "order_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_return_items" DROP CONSTRAINT IF EXISTS "order_return_items_orderItemId_fkey";
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
