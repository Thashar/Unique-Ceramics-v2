-- Rabat procentowy pojedynczego produktu (0 = brak przeceny).
-- Uruchom ręcznie w SQL Editorze Supabase PRZED wdrożeniem – bez tej kolumny
-- zapytania Prismy o produkty zwrócą błąd i sklep przestanie się renderować.
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER NOT NULL DEFAULT 0;
