// Wspólna kontrola źródła zdjęcia dla tras admina, które pobierają plik po URL-u
// (obrót, generowanie AI). Bez niej endpoint pobrałby dowolny adres z body – czyli SSRF.

export const MAX_SOURCE_SIZE = 15 * 1024 * 1024; // 15 MB

/**
 * Dopuszczamy wyłącznie własne zdjęcia: ścieżkę z `public/` albo obiekt z naszego
 * Storage. Zwraca pełny adres do pobrania albo `null`, gdy źródło jest obce.
 */
export function resolveOwnImageSource(url: string, origin: string): string | null {
  if (url.startsWith("/") && !url.startsWith("//")) return `${origin}${url}`;
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (base && url.startsWith(`${base}/storage/v1/object/public/`)) return url;
  return null;
}

/** Pobiera własne zdjęcie z limitem rozmiaru (rzuca przy błędzie – łap u wywołującego). */
export async function fetchOwnImage(source: string): Promise<Buffer> {
  const res = await fetch(source, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_SOURCE_SIZE) throw new Error("plik za duży");
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_SOURCE_SIZE) throw new Error("plik za duży");
  return Buffer.from(bytes);
}
