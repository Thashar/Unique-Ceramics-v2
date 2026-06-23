-- Migracja: dodanie pól do zamówień indywidualnych (CustomOrder)
-- Autor: Claude Code | Data: 2026-06-23

-- 1. Dodaj sekwencję i kolumnę orderNumber (auto-increment, unikalny)
CREATE SEQUENCE IF NOT EXISTS "CustomOrder_orderNumber_seq";

ALTER TABLE "CustomOrder"
  ADD COLUMN IF NOT EXISTS "orderNumber" INTEGER NOT NULL DEFAULT nextval('"CustomOrder_orderNumber_seq"'),
  ADD COLUMN IF NOT EXISTS "price"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "paidAmount"  DOUBLE PRECISION;

ALTER SEQUENCE "CustomOrder_orderNumber_seq" OWNED BY "CustomOrder"."orderNumber";

-- 2. Upewnij się, że orderNumber jest unikalny
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'CustomOrder' AND indexname = 'CustomOrder_orderNumber_key'
  ) THEN
    CREATE UNIQUE INDEX "CustomOrder_orderNumber_key" ON "CustomOrder"("orderNumber");
  END IF;
END$$;

-- 3. Dodaj wartość PAID do enumu CustomOrderStatus
-- PostgreSQL wymaga ALTER TYPE ... ADD VALUE; nie można tego zrobić w transakcji
ALTER TYPE "CustomOrderStatus" ADD VALUE IF NOT EXISTS 'PAID' AFTER 'IN_REVIEW';
