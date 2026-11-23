-- Ubicación = nombre + fila + columna. Se elimina el sector (nombre/descripción)
-- y la estantería de una letra. El código visible pasa a ser fila-columna.

ALTER TABLE "warehouse_locations" ADD COLUMN IF NOT EXISTS "name" TEXT;

UPDATE "warehouse_locations" AS l
SET "name" = s."name"
FROM "warehouse_sectors" AS s
WHERE l."sectorId" = s."id"
  AND (l."name" IS NULL OR btrim(l."name") = '');

UPDATE "warehouse_locations"
SET "name" = COALESCE(NULLIF(btrim("shelf"), ''), 'Ubicacion')
WHERE "name" IS NULL OR btrim("name") = '';

-- Si al sacar la estantería quedan dos celdas iguales, se conserva la letra en el nombre.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "name", "row", "col"
      ORDER BY "createdAt", id
    ) AS rn
  FROM "warehouse_locations"
)
UPDATE "warehouse_locations" AS l
SET "name" = l."name" || ' ' || l."shelf"
FROM ranked AS r
WHERE l.id = r.id
  AND r.rn > 1
  AND l."shelf" IS NOT NULL
  AND btrim(l."shelf") <> '';

UPDATE "warehouse_locations"
SET "code" = btrim("row") || '-' || btrim("col");

ALTER TABLE "warehouse_locations" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "warehouse_locations" DROP CONSTRAINT IF EXISTS "warehouse_locations_code_key";

ALTER TABLE "warehouse_locations" DROP CONSTRAINT IF EXISTS "warehouse_locations_sectorId_fkey";

DROP INDEX IF EXISTS "warehouse_locations_sectorId_idx";

ALTER TABLE "warehouse_locations" DROP COLUMN IF EXISTS "sectorId";
ALTER TABLE "warehouse_locations" DROP COLUMN IF EXISTS "shelf";

CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_locations_name_row_col_key"
  ON "warehouse_locations" ("name", "row", "col");

DROP TABLE IF EXISTS "warehouse_sectors";
