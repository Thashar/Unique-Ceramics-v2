-- Okno obowiązywania rabatu produktowego (czas zapisujemy w UTC – panel
-- przelicza go z czasu polskiego). NULL = brak ograniczenia:
--   discountStartsAt NULL → rabat działa od razu,
--   discountEndsAt   NULL → rabat jest bezterminowy.
-- Uruchom ręcznie w SQL Editorze Supabase PRZED wdrożeniem – bez tych kolumn
-- zapytania Prismy o produkty zwrócą błąd i sklep przestanie się renderować.
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "discountStartsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "discountEndsAt"   TIMESTAMP(3);
