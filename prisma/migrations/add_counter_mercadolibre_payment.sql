-- Medio de pago mostrador: venta por MercadoLibre con total cobrado editable
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'COUNTER_MERCADOLIBRE';
