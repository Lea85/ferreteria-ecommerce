-- Respaldo de costo en líneas de pedido/devolución para estadísticas tras eliminar productos.
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "unitCostSnapshot" DECIMAL(12, 2);

ALTER TABLE "order_return_items"
  ADD COLUMN IF NOT EXISTS "unitCostSnapshot" DECIMAL(12, 2);
