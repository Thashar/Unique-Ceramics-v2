-- Sprzedaż poza sklepem – ręczne wpisy doliczane do analityki (jarmarki,
-- sprzedaż bezpośrednia, zamówienia dogadane poza sklepem).
-- Brak tabeli nie wywraca analityki (odczyty są w try/catch), ale formularz
-- pokaże wtedy instrukcję migracji zamiast listy.

CREATE TABLE IF NOT EXISTS "ExternalSale" (
  "id"          TEXT NOT NULL,
  "soldAt"      TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "amount"      DOUBLE PRECISION NOT NULL,
  "note"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalSale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExternalSale_soldAt_idx" ON "ExternalSale"("soldAt");
