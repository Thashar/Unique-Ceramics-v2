-- Kody rabatowe: tabela kodów + ślad po użyciu w zamówieniu.
-- Uruchom ręcznie w SQL Editorze Supabase PRZED wdrożeniem.
-- Sklep działa też bez tej tabeli (kody są wtedy po prostu nieaktywne),
-- ale panel „Kody rabatowe" pokaże instrukcję zamiast listy.
CREATE TABLE IF NOT EXISTS "DiscountCode" (
  "id"        TEXT PRIMARY KEY,
  "code"      TEXT NOT NULL,
  "percent"   INTEGER NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "stackable" BOOLEAN NOT NULL DEFAULT true,
  "startsAt"  TIMESTAMP(3),
  "endsAt"    TIMESTAMP(3),
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX IF NOT EXISTS "DiscountCode_active_idx" ON "DiscountCode"("active");

-- Ślad użytego kodu w zamówieniu (kwota jest już wliczona w ceny pozycji)
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "discountCode"   TEXT,
  ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION;
