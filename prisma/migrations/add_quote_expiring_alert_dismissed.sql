-- Permite ocultar un presupuesto del alerta "por vencer" en el dashboard
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "expiringAlertDismissedAt" TIMESTAMP(3);
