-- Ruch na stronie – dzienne agregaty z Vercel Web Analytics zapisywane w naszej
-- bazie (plan Hobby trzyma dane tylko przez miesiąc; cron dopisuje codziennie
-- wczorajszy dzień, więc historia rośnie bez limitu).
-- Brak tabeli nie wywraca panelu (odczyty są w try/catch) – strona /admin/ruch
-- pokaże wtedy dane „na żywo" z API i instrukcję migracji zamiast historii.

CREATE TABLE IF NOT EXISTS "TrafficStat" (
  "id"        TEXT NOT NULL,
  "date"      TIMESTAMP(3) NOT NULL,
  "dimension" TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "pageviews" INTEGER NOT NULL,
  "visitors"  INTEGER NOT NULL,
  "syncedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrafficStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrafficStat_date_dimension_value_key"
  ON "TrafficStat"("date", "dimension", "value");

CREATE INDEX IF NOT EXISTS "TrafficStat_dimension_date_idx"
  ON "TrafficStat"("dimension", "date");
