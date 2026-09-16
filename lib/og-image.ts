// Obrazki podglądu linku (Open Graph) – wspólne dla tras `/api/og/*` (serwer).
//
// Komunikatory (WhatsApp, Messenger, Discord, Facebook) potrzebują JPEG/PNG
// w kadrze 1,91:1 – zdjęcia trzymamy w WebP, którego WhatsApp nie renderuje,
// więc każdą stronę obsługuje trasa oddająca JPEG 1200×630 z prawdziwego
// zdjęcia: produkt → jego pierwsze zdjęcie, strona z nagłówkiem (główna,
// O mnie, Warsztaty) → jej hero z ustawień, kategoria → pierwszy produkt,
// projekt → pierwsze zdjęcie. Strony bez własnego nagłówka dostają hero
// strony głównej (`OG_IMAGE` w `lib/seo.ts`).

import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveOwnImageSource, fetchOwnImage } from "@/lib/image-source";

/** Standardowy kadr podglądu linku – 1,91:1. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Tło uzupełniające kadr przy `contain` – `cream` z palety sklepu. */
const BACKGROUND = { r: 245, g: 240, b: 232 };

/** Punkt kadrowania z panelu (`"50% 30%"`, format `object-position`) → ułamki 0–1. */
export function parseFocal(position: string | undefined): { x: number; y: number } {
  const m = /^\s*(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(position ?? "");
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  if (!m) return { x: 0.5, y: 0.5 };
  return { x: clamp(Number(m[1]) / 100), y: clamp(Number(m[2]) / 100) };
}

/** Całe zdjęcie w kadrze, z tłem po bokach – produkty bywają pionowe, obcięcie byłoby gorsze. */
export async function renderContain(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .resize({ width: OG_WIDTH, height: OG_HEIGHT, fit: "contain", background: BACKGROUND })
    .jpeg({ quality: 82 })
    .toBuffer();
}

/**
 * Kadr wypełniony zdjęciem (`cover`) z zachowaniem punktu kadrowania
 * ustawionego w panelu – ten sam, którym strona ustawia `object-position`,
 * więc podgląd linku pokazuje to, co widać w nagłówku.
 */
export async function renderCover(original: Buffer, position?: string): Promise<Buffer> {
  const focal = parseFocal(position);
  const meta = await sharp(original).metadata();
  const w = meta.width ?? OG_WIDTH;
  const h = meta.height ?? OG_HEIGHT;
  const scale = Math.max(OG_WIDTH / w, OG_HEIGHT / h);
  const rw = Math.max(OG_WIDTH, Math.round(w * scale));
  const rh = Math.max(OG_HEIGHT, Math.round(h * scale));
  const left = Math.round(Math.min(Math.max(focal.x * rw - OG_WIDTH / 2, 0), rw - OG_WIDTH));
  const top = Math.round(Math.min(Math.max(focal.y * rh - OG_HEIGHT / 2, 0), rh - OG_HEIGHT));
  return sharp(original)
    .resize({ width: rw, height: rh, fit: "fill" })
    .extract({ left, top, width: OG_WIDTH, height: OG_HEIGHT })
    .jpeg({ quality: 82 })
    .toBuffer();
}

/** Pobiera własne zdjęcie (blokada SSRF jak przy obrocie i AI); `null`, gdy adres obcy albo błąd. */
export async function loadOwnImage(url: string | undefined, origin: string): Promise<Buffer | null> {
  if (!url) return null;
  const source = resolveOwnImageSource(url, origin);
  if (!source) return null;
  try {
    return await fetchOwnImage(source);
  } catch (e) {
    console.error("[og-image] pobranie zdjęcia:", e);
    return null;
  }
}

/** Domyślna grafika z `public/` – gdy strona nie ma jeszcze zdjęcia. */
export async function fallbackImage(): Promise<Buffer> {
  return readFile(path.join(process.cwd(), "public", "images", "OpenGraph.jpg"));
}

/**
 * Odpowiedź z JPEG-iem. Komunikatory cache'ują podgląd po swojej stronie;
 * krótkie `s-maxage` (domyślnie godzina) wystarczy, żeby zmiana zdjęcia
 * w panelu weszła w rozsądnym czasie.
 */
export function jpegResponse(jpeg: Buffer, sMaxAge = 3600): Response {
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": `public, max-age=3600, s-maxage=${sMaxAge}, stale-while-revalidate=604800`,
    },
  });
}
