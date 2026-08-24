-- Kod rabatowy na darmową wysyłkę.
--
-- Kod może teraz dawać rabat procentowy, darmową wysyłkę albo jedno i drugie.
-- Kolumna ma default false, więc istniejące kody działają dokładnie jak dotąd.
--
-- Uruchom ręcznie na Supabase (DIRECT_URL niedostępny lokalnie).

ALTER TABLE "DiscountCode"
  ADD COLUMN IF NOT EXISTS "freeShipping" BOOLEAN NOT NULL DEFAULT false;
