ALTER TABLE "supplier_order_items"
  ADD COLUMN IF NOT EXISTS "unitCostPrice" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "unitSalePrice" DECIMAL(12,2);
