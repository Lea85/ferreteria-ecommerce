-- Fila y columna de una ubicación pasan a ser el tamaño máximo de su grilla.
-- La celda concreta (fila/columna de un producto) queda en el producto.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warehouseRow" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warehouseCol" INTEGER;

CREATE INDEX IF NOT EXISTS "products_warehouseLocationId_warehouseRow_warehouseCol_idx"
  ON "products" ("warehouseLocationId", "warehouseRow", "warehouseCol");

ALTER TABLE "warehouse_locations" ADD COLUMN IF NOT EXISTS "maxRows" INTEGER;
ALTER TABLE "warehouse_locations" ADD COLUMN IF NOT EXISTS "maxCols" INTEGER;

UPDATE "warehouse_locations"
SET
  "maxRows" = CASE
    WHEN btrim("row") ~ '^[0-9]+$' THEN GREATEST(1, LEAST(btrim("row")::int, 40))
    ELSE 1
  END,
  "maxCols" = CASE
    WHEN btrim("col") ~ '^[0-9]+$' THEN GREATEST(1, LEAST(btrim("col")::int, 40))
    ELSE 1
  END
WHERE "maxRows" IS NULL OR "maxCols" IS NULL;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "name" ORDER BY "createdAt", id) AS rn
  FROM "warehouse_locations"
)
UPDATE "warehouse_locations" AS l
SET "name" = l."name" || ' ' || r.rn::text
FROM ranked AS r
WHERE l.id = r.id
  AND r.rn > 1;

UPDATE "warehouse_locations"
SET "code" = "maxRows"::text || 'x' || "maxCols"::text;

ALTER TABLE "warehouse_locations" ALTER COLUMN "maxRows" SET NOT NULL;
ALTER TABLE "warehouse_locations" ALTER COLUMN "maxCols" SET NOT NULL;

DROP INDEX IF EXISTS "warehouse_locations_name_row_col_key";

ALTER TABLE "warehouse_locations" DROP COLUMN IF EXISTS "row";
ALTER TABLE "warehouse_locations" DROP COLUMN IF EXISTS "col";

CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_locations_name_key"
  ON "warehouse_locations" ("name");
