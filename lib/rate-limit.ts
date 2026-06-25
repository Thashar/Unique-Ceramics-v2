// Rate limiter dla API routes.
//
// Domyślnie używa trwałego magazynu Upstash Redis (REST) — działa poprawnie na
// serverless/Vercel, gdzie instancje są efemeryczne i jest ich wiele równolegle.
// Gdy zmienne UPSTASH_* nie są ustawione (lub Redis chwilowo niedostępny),
// degraduje się do limitera in-memory (per-instancja) — wystarczający lokalnie
// i jako bezpiecznik, ale na produkcji skonfiguruj Upstash.

// ── Fallback in-memory ────────────────────────────────────────────────────────

type Entry = { timestamps: number[] };
const store = new Map<string, Entry>();

// Czyść stare wpisy co 5 minut, żeby mapa nie rosła bez końca
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  });
}, 5 * 60_000);

function inMemoryRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = store.get(ip) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  entry.timestamps.push(now);
  store.set(ip, entry);

  return entry.timestamps.length > limit;
}

// ── Trwały limiter (Upstash Redis REST, okno stałe) ───────────────────────────

/**
 * Zwraca true/false gdy Upstash jest skonfigurowany i odpowiedział,
 * albo null gdy brak konfiguracji / błąd (wtedy używamy fallbacku in-memory).
 */
async function upstashRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  // Okno stałe (fixed window): wszystkie żądania z tego samego przedziału
  // czasu trafiają do jednego klucza, który wygasa po windowSec.
  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${bucket}`;

  try {
    // Jedno round-trip: INCR + EXPIRE w pipeline.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;
    return count > limit;
  } catch {
    // Niedostępny Redis — fallback do in-memory (fail-safe: nie blokujemy ruchu)
    return null;
  }
}

/**
 * Sprawdza czy klucz (zwykle IP lub `akcja:identyfikator`) przekroczył limit.
 * @param key      Klucz limitu (IP albo np. `login:email`)
 * @param limit    Maks. liczba żądań w oknie (domyślnie 10)
 * @param windowMs Okno czasowe w ms (domyślnie 60 000 = 1 minuta)
 * @returns true = limit przekroczony (zablokuj żądanie)
 */
export async function isRateLimited(
  key: string,
  limit = 10,
  windowMs = 60_000
): Promise<boolean> {
  const durable = await upstashRateLimited(key, limit, windowMs);
  if (durable !== null) return durable;
  return inMemoryRateLimited(key, limit, windowMs);
}

/** Pobiera IP z nagłówków Next.js (Vercel + standard proxy) */
export function getClientIp(req: Request): string {
  const headers = new Headers((req as Request).headers);
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
