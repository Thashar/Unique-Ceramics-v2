-- Zmiana adresu e-mail konta przez link potwierdzający.
--
-- E-mail jest jednocześnie loginem, więc jego podmiana wymaga udowodnienia
-- dostępu do nowej skrzynki. Tabela trzyma oczekujące żądanie: adres docelowy
-- i **hash** tokenu (surowy token istnieje wyłącznie w wysłanym mailu).
--
-- Uruchom ręcznie na Supabase (DIRECT_URL niedostępny lokalnie).
-- Bez tej tabeli zmiana adresu jest niedostępna, ale reszta sklepu działa
-- normalnie – odczyty są w try/catch.

CREATE TABLE IF NOT EXISTS "EmailChangeRequest" (
  "id"        TEXT PRIMARY KEY,
  -- Jedno oczekujące żądanie na konto: nowe zastępuje poprzednie
  "userId"    TEXT NOT NULL UNIQUE,
  "newEmail"  TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailChangeRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Potwierdzenie szuka żądania po hashu tokenu
CREATE UNIQUE INDEX IF NOT EXISTS "EmailChangeRequest_tokenHash_key"
  ON "EmailChangeRequest" ("tokenHash");
