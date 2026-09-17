import sharp from "sharp";
import { AI_TEXT_LIMITS } from "@/lib/ai";
import { fetchOwnImage, resolveOwnImageSource } from "@/lib/image-source";

/**
 * Wspólne kawałki tras opisujących produkt ze zdjęcia (`/api/admin/ai-text`
 * i `/api/admin/ai-product-card`): przygotowanie zdjęcia dla modelu
 * tekstowego, odczyt JSON-a z odpowiedzi i normalizacja pól. Serwer (sharp).
 */

/** Do opisu wystarczy mniejsze zdjęcie niż do generowania grafiki. */
const INPUT_MAX_WIDTH = 1024;

/**
 * Zdjęcie z własnego źródła (blokada SSRF jak przy obrocie i AI) jako JPEG
 * ≤1024 px. `null` = obce źródło; wyjątek = nie dało się pobrać/przetworzyć.
 */
export async function loadImageForText(url: string, origin: string): Promise<Buffer | null> {
  const source = resolveOwnImageSource(url, origin);
  if (!source) return null;
  const original = await fetchOwnImage(source);
  return sharp(original)
    .resize({ width: INPUT_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Ten sam format sluga co w walidacji produktu (`[a-z0-9-]`). */
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, AI_TEXT_LIMITS.slug);
}

/** Model bywa rozmowny – wyciągamy sam obiekt JSON z odpowiedzi. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const withoutFences = text.replace(/```(?:json)?/gi, "").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(withoutFences.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

// Model bywa głuchy na prośbę o półpauzę, a długi myślnik łamie typografię sklepu
// (patrz CLAUDE.md) – zamieniamy go niezależnie od tego, co przyjdzie z modelu.
export const cleanText = (value: unknown, max: number): string =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").replace(/[—―]/g, "–").slice(0, max)
    : "";

export type ProductTextDraft = {
  name: string;
  slug: string;
  category: string;
  description: string;
};

/** Pola produktu z odpowiedzi modelu; kategoria tylko wtedy, gdy istnieje w sklepie. */
export function readProductDraft(
  parsed: Record<string, unknown>,
  categories: { slug: string }[],
): ProductTextDraft {
  const name = cleanText(parsed.name, AI_TEXT_LIMITS.name);
  const slugFromModel = normalizeSlug(cleanText(parsed.slug, AI_TEXT_LIMITS.slug));
  const categorySlug = cleanText(parsed.category, 100).toLowerCase();
  return {
    name,
    slug: slugFromModel || normalizeSlug(name),
    category: categories.some((c) => c.slug === categorySlug) ? categorySlug : "",
    description: cleanText(parsed.description, AI_TEXT_LIMITS.description),
  };
}
