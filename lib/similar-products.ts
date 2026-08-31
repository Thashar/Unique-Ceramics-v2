/**
 * Dobór „podobnych produktów” pod kartą produktu (moduł neutralny, bez bazy).
 *
 * Katalog jest mały i **bardzo nierówny** – połowa kategorii ma jeden produkt,
 * więc sama reguła „inne z tej samej kategorii” dawałaby na tych kartach pustą
 * sekcję. Dlatego kandydatem jest cały katalog, a kolejność ustala punktacja:
 * najwyżej **kolekcja** (seria), potem kategoria, dalej zbliżona cena,
 * wyróżnienie i trwająca przecena.
 *
 * Wyprzedanych **nie pokazujemy w ogóle** (decyzja właściciela 31.08.2026):
 * karuzela ma prowadzić do rzeczy, które da się kupić od ręki.
 */

export type SimilarProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  /** Slug kolekcji (serii) albo null – produkt nie musi należeć do żadnej. */
  collection?: string | null;
  price: number;
  images: string[];
  stock: number;
  featured: boolean;
  // Okno rabatu – wywołujący sprawdza nim `activeDiscountPercent`; sam moduł
  // dat nie interpretuje, żeby zostać neutralnym i testowalnym
  discountPercent?: number | null;
  discountStartsAt?: Date | string | null;
  discountEndsAt?: Date | string | null;
};

/** Ile kafelków pokazuje karuzela. */
export const SIMILAR_LIMIT = 8;

/**
 * Kolekcja (seria) waży **więcej niż kategoria** – to świadomy wybór właściciela:
 * rzeczy zrobione razem tworzą komplet, więc mają się polecać nawzajem przed
 * innymi produktami z tej samej półki. Produkt bez kolekcji nie dostaje tych
 * punktów, a `null` nie łączy się z `null` (brak serii to nie jest wspólna seria).
 */
const SCORE_SAME_COLLECTION = 250;
const SCORE_SAME_CATEGORY = 100;
/** Cena bliska (do 30 %) i umiarkowanie bliska (do 60 %) – klient porównuje w podobnym progu. */
const SCORE_PRICE_CLOSE = 25;
const SCORE_PRICE_NEAR = 10;
const PRICE_CLOSE_RATIO = 0.3;
const PRICE_NEAR_RATIO = 0.6;
const SCORE_FEATURED = 8;
const SCORE_DISCOUNTED = 5;

/**
 * Stabilny „szum” rozstrzygający remisy: ta sama para produktów zawsze daje tę
 * samą wartość < 1 pkt, więc kolejność nie zmienia się między rewalidacjami ISR
 * (losowanie migałoby przy każdym odświeżeniu cache), a mimo to nie jest to
 * zwykła kolejność alfabetyczna. FNV-1a na parze slugów.
 */
function pairNoise(a: string, b: string): number {
  let hash = 0x811c9dc5;
  const input = `${a}|${b}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0xffffffff;
}

/** Różnica cen jako ułamek ceny oglądanego produktu (0 = identyczna). */
function priceDistance(current: number, candidate: number): number {
  const base = Math.max(current, 1);
  return Math.abs(candidate - current) / base;
}

export function similarityScore(
  current: Pick<SimilarProduct, "slug" | "category" | "price" | "collection">,
  candidate: SimilarProduct,
  { discounted = false }: { discounted?: boolean } = {},
): number {
  let score = 0;
  if (current.collection && candidate.collection === current.collection) {
    score += SCORE_SAME_COLLECTION;
  }
  if (candidate.category === current.category) score += SCORE_SAME_CATEGORY;

  const distance = priceDistance(current.price, candidate.price);
  if (distance <= PRICE_CLOSE_RATIO) score += SCORE_PRICE_CLOSE;
  else if (distance <= PRICE_NEAR_RATIO) score += SCORE_PRICE_NEAR;

  if (candidate.featured) score += SCORE_FEATURED;
  if (discounted) score += SCORE_DISCOUNTED;

  return score + pairNoise(current.slug, candidate.slug);
}

/**
 * Lista produktów pod kartę `current`, posortowana od najbardziej pasujących.
 * Pomija sam oglądany produkt i wszystko, czego nie ma na stanie.
 *
 * `isDiscounted` podaje wywołujący – okno przeceny rozstrzyga
 * `activeDiscountPercent` z `lib/product-price.ts`, a ten moduł ma zostać
 * neutralny (bez czasu i bez bazy), żeby dało się go przetestować.
 */
export function similarProducts(
  products: SimilarProduct[],
  current: Pick<SimilarProduct, "id" | "slug" | "category" | "price" | "collection">,
  {
    limit = SIMILAR_LIMIT,
    isDiscounted,
  }: { limit?: number; isDiscounted?: (product: SimilarProduct) => boolean } = {},
): SimilarProduct[] {
  return products
    .filter((p) => p.id !== current.id && p.stock > 0)
    .map((product) => ({
      product,
      score: similarityScore(current, product, {
        discounted: isDiscounted?.(product) ?? false,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}
