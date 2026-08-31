-- Kolekcje produktów (serie) + przypisanie kolekcji do produktu.
-- Uruchom PRZED wdrożeniem kodu: `Product.collection` jest czytane przy każdym
-- odczycie produktu, więc bez kolumny zapytania padają i sklep przestaje się renderować.

CREATE TABLE IF NOT EXISTS "Collection" (
  "id"        TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Collection_slug_key" ON "Collection"("slug");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "collection" TEXT;

CREATE INDEX IF NOT EXISTS "Product_active_collection_idx" ON "Product"("active", "collection");
