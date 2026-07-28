-- Rejestr zużycia AI (generowanie zdjęć produktów przyciskami AI / AI+).
-- Wykonaj ręcznie w Supabase → SQL Editor (DIRECT_URL nie jest dostępny lokalnie).
--
-- Bez tej tabeli generowanie nadal działa (zapis zużycia jest „best effort”),
-- ale zakładka Ustawienia → AI (zdjęcia) pokaże komunikat zamiast statystyk.

CREATE TABLE IF NOT EXISTS "AiImageUsage" (
    "id"           TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variant"      TEXT NOT NULL,
    "model"        TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimated"    BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AiImageUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiImageUsage_createdAt_idx" ON "AiImageUsage"("createdAt");
CREATE INDEX IF NOT EXISTS "AiImageUsage_model_idx" ON "AiImageUsage"("model");
