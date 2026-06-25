-- Uruchom w Supabase SQL Editor (Project → SQL Editor)
-- Dodaje znacznik daty/godziny wpłaty do zamówień sklepowych.
-- paidAt podaje admin w modalu przy zmianie statusu na „Opłacone"; przychód
-- (raporty, analityki, limit działalności nierejestrowanej) rozpoznawany jest
-- wg tej daty (fallback createdAt dla starych, opłaconych zamówień bez paidAt).
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
