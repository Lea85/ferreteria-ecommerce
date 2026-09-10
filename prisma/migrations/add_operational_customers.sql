-- Cliente operativo (presupuestos / mostrador, sin login)
CREATE TABLE IF NOT EXISTS "operational_customers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lastName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "customerType" "CustomerType" NOT NULL DEFAULT 'CONSUMER',
  "taxIdType" TEXT,
  "taxId" TEXT,
  "companyName" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operational_customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "operational_customers_name_idx" ON "operational_customers"("name");
CREATE INDEX IF NOT EXISTS "operational_customers_email_idx" ON "operational_customers"("email");
CREATE INDEX IF NOT EXISTS "operational_customers_phone_idx" ON "operational_customers"("phone");
CREATE INDEX IF NOT EXISTS "operational_customers_taxId_idx" ON "operational_customers"("taxId");

ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "operationalCustomerId" TEXT;

-- Permitir presupuestos solo con cliente operativo (sin User)
ALTER TABLE "quotes" ALTER COLUMN "userId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "quotes_operationalCustomerId_idx" ON "quotes"("operationalCustomerId");

ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_operationalCustomerId_fkey";
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_operationalCustomerId_fkey"
  FOREIGN KEY ("operationalCustomerId") REFERENCES "operational_customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
