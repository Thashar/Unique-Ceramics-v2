-- Ślad cenowy zamówienia: pełne rozbicie rabatów w historii.
--
-- Bez tych kolumn podsumowanie zamówienia nie sumowało się do kwoty zapłaconej
-- (wiersz „Kod rabatowy” odejmował kwotę, która siedziała już w cenach pozycji),
-- a wygląd starego zamówienia zależał od bieżącego stanu promocji w panelu.
--
-- Uruchom ręcznie na Supabase (DIRECT_URL niedostępny lokalnie).

-- Cena katalogowa pozycji sprzed rabatu produktowego (NULL = zamówienie sprzed zmiany)
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "basePrice" DOUBLE PRECISION;

-- Narzut promocji „Wielosztuki” wliczony w ceny w chwili zakupu
-- (NULL = promocja wtedy nie obowiązywała)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "bundleSurcharge" DOUBLE PRECISION;
