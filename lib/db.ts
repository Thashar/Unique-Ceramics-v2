import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Pooler Supabase w trybie **session** trzyma jedno połączenie do Postgresa na
 * każdego klienta, więc `pool_size` (domyślnie 15) wyczerpuje się już przy
 * kilkunastu instancjach serverless naraz – wtedy wszystko sypie się błędem
 * `FATAL: (EMAXCONNSESSION) max clients reached in session mode`. Tryb
 * **transaction** (port 6543 + `pgbouncer=true`) multipleksuje i takiego limitu
 * praktycznie nie ma. Ostrzeżenie w logach, bo to konfiguracja poza kodem
 * (zmienna środowiskowa na Vercelu / tryb puli w panelu Supabase).
 */
function warnAboutSessionPooler(url: string) {
  if (/pooler.supabase.com:5432/.test(url)) {
    console.warn(
      "[db] DATABASE_URL wskazuje pooler Supabase na porcie 5432 (tryb session). " +
        "Użyj portu 6543 z ?pgbouncer=true (tryb transaction) – inaczej pula 15 klientów " +
        "wyczerpuje się przy kilkunastu instancjach i baza zwraca EMAXCONNSESSION."
    );
  }
}

function buildUrl() {
  let url = process.env.DATABASE_URL ?? "";
  warnAboutSessionPooler(url);
  const sep = url.includes("?") ? "&" : "?";
  // connection_limit=1 zawsze – jeden klient Prisma na instancję serverless
  if (!url.includes("connection_limit=")) url += `${sep}connection_limit=1`;
  if (!url.includes("pool_timeout="))    url += "&pool_timeout=10";
  if (!url.includes("connect_timeout=")) url += "&connect_timeout=10";
  return url;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: { db: { url: buildUrl() } },
  });

if (!globalForPrisma.prisma) globalForPrisma.prisma = db;

/**
 * Ponawia zapytanie, gdy baza chwilowo odrzuca połączenie.
 *
 * Pooler Supabase ma ograniczoną liczbę klientów (`pool_size`, domyślnie 15)
 * dzieloną przez wszystko, co korzysta z bazy: instancje produkcyjne, cron,
 * panel i build. Przy budowaniu potrafi więc paść `FATAL: (EMAXCONNSESSION)
 * max clients reached` – wtedy strona ISR zapisuje się z danymi zastępczymi
 * (pusty katalog, domyślne kategorie), zamiast z prawdziwą treścią. Krótka
 * przerwa zwykle wystarcza, bo połączenia zwalniają się w ułamku sekundy.
 *
 * Helper tylko ponawia – decyzję, czy po nieudanych próbach oddać dane
 * zastępcze, czy przerwać build, zostawia wywołującemu.
 */
export async function withDbRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await run();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastError;
}
