-- Uruchom w Supabase SQL Editor (Project → SQL Editor)
-- Dodaje znaczniki czasu płatności i rozliczenia do zamówień sklepowych:
--   paidAt         — moment oznaczenia zamówienia jako opłacone (status → Opłacone / webhook Stripe)
--   settlementDate — ręczne nadpisanie miesiąca rozliczenia (przychód rozpoznawany wg daty wpłaty)
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "paidAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "settlementDate" TIMESTAMP(3);
