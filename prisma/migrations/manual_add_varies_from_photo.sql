-- Dodaj kolumnę variesFromPhoto do tabeli Product
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "variesFromPhoto" BOOLEAN NOT NULL DEFAULT false;
