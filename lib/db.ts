import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildUrl() {
  let url = process.env.DATABASE_URL ?? "";
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
