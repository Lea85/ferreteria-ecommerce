-- Opciones de tarjeta de crédito en compra mostrador (idempotente en PostgreSQL 15+)
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'COUNTER_CREDIT_ABSORBE_LOCAL';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'COUNTER_CREDIT_ABSORBE_BANCO';
