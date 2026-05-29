// Prosty in-memory rate limiter dla API routes.
// Przechowuje timestampy żądań per IP. Bezstanowy między restartami serwera —
// na potrzeby małego sklepu wystarczający.

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

/**
 * Sprawdza czy IP przekroczyło limit.
 * @param ip       Adres IP klienta
 * @param limit    Maks. liczba żądań w oknie (domyślnie 10)
 * @param windowMs Okno czasowe w ms (domyślnie 60 000 = 1 minuta)
 * @returns true = limit przekroczony (zablokuj żądanie)
 */
export function isRateLimited(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = store.get(ip) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  entry.timestamps.push(now);
  store.set(ip, entry);

  return entry.timestamps.length > limit;
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
