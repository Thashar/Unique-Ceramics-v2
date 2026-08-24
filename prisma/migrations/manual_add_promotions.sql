-- Promocje: rabat ilościowy + darmowa wysyłka.
--
-- Zastępują wycofaną promocję „Wielosztuki” (narzut wysyłki w cenie katalogowej,
-- oddawany jako pozorny rabat – suma zamówienia była taka sama jak bez promocji)
-- oraz stały próg darmowej wysyłki z ustawień `shipping_free_enabled` /
-- `shipping_free_from`.
--
-- Uruchom ręcznie na Supabase (DIRECT_URL niedostępny lokalnie).
-- Sklep działa bez tych tabel – odczyty są w try/catch i wtedy promocje po
-- prostu nie obowiązują – ale kolumny na "Order" są wymagane przez /api/checkout.

-- ── Rabat ilościowy ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "QuantityPromo" (
  "id"                        TEXT PRIMARY KEY,
  "name"                      TEXT NOT NULL,
  "active"                    BOOLEAN NOT NULL DEFAULT true,
  "startsAt"                  TIMESTAMP(3),
  "endsAt"                    TIMESTAMP(3),
  "stackable"                 BOOLEAN NOT NULL DEFAULT true,
  "includeDiscountedProducts" BOOLEAN NOT NULL DEFAULT false,
  "minItemPrice"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "maxDiscount"               DOUBLE PRECISION,
  "tiers"                     JSONB NOT NULL,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "QuantityPromo_active_idx" ON "QuantityPromo" ("active");

-- ── Darmowa wysyłka ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "FreeShippingPromo" (
  "id"            TEXT PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "active"        BOOLEAN NOT NULL DEFAULT true,
  "startsAt"      TIMESTAMP(3),
  "endsAt"        TIMESTAMP(3),
  "minOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "methods"       TEXT[] NOT NULL DEFAULT ARRAY['courier', 'parcel_locker']::TEXT[],
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FreeShippingPromo_active_idx" ON "FreeShippingPromo" ("active");

-- ── Ślad rabatu ilościowego na zamówieniu ────────────────────────────────────

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "quantityDiscountPercent" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "quantityDiscountAmount" DOUBLE PRECISION;

-- ── Przeniesienie dotychczasowego progu darmowej wysyłki ─────────────────────
--
-- Tworzy bezterminową promocję odwzorowującą obecne ustawienia. Wykona się tylko
-- raz (gdy tabela jest pusta) i tylko gdy darmowa wysyłka była włączona.

INSERT INTO "FreeShippingPromo" ("id", "name", "active", "minOrderValue", "methods")
SELECT
  'seed-free-shipping-threshold',
  'Darmowa wysyłka od progu',
  true,
  COALESCE(NULLIF((SELECT "value" FROM "Setting" WHERE "key" = 'shipping_free_from'), ''), '300')::DOUBLE PRECISION,
  ARRAY['courier', 'parcel_locker']::TEXT[]
WHERE
  COALESCE((SELECT "value" FROM "Setting" WHERE "key" = 'shipping_free_enabled'), 'true') = 'true'
  AND NOT EXISTS (SELECT 1 FROM "FreeShippingPromo");

-- Wycofane ustawienia – od teraz nieczytane przez sklep.
DELETE FROM "Setting" WHERE "key" IN ('shipping_free_enabled', 'shipping_free_from', 'bundled_shipping_enabled');
