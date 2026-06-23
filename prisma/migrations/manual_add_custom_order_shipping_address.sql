-- Migracja: dodanie adresu i kosztu wysyłki do zamówień indywidualnych
-- Data: 2026-06-23

ALTER TABLE "CustomOrder"
  ADD COLUMN IF NOT EXISTS "shippingCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "street"       TEXT,
  ADD COLUMN IF NOT EXISTS "city"         TEXT,
  ADD COLUMN IF NOT EXISTS "postcode"     TEXT;
