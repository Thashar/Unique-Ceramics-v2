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
export const SCORE_SAME_COLLECTION = 250;
export const SCORE_SAME_CATEGORY = 100;
/** Cena bliska (do 30 %) i umiarkowanie bliska (do 60 %) – klient porównuje w podobnym progu. */
export const SCORE_PRICE_CLOSE = 25;
export const SCORE_PRICE_NEAR = 10;
const PRICE_CLOSE_RATIO = 0.3;
const PRICE_NEAR_RATIO = 0.6;
export const SCORE_FEATURED = 8;
export const SCORE_DISCOUNTED = 5;

/**
 * Punktacja opisana słowami – panel („Ustawienia → Proponowane") pokazuje ją
 * wprost z tych wartości, żeby opis nigdy nie rozjechał się z algorytmem.
 */
export const SIMILARITY_RULES: { points: number; label: string; hint: string }[] = [
  {
    points: SCORE_SAME_COLLECTION,
    label: "Ta sama kolekcja",
    hint: "Produkty z jednej serii polecają się nawzajem przed wszystkim innym.",
  },
  {
    points: SCORE_SAME_CATEGORY,
    label: "Ta sama kategoria",
    hint: "Np. kubek przy kubku.",
  },
  {
    points: SCORE_PRICE_CLOSE,
    label: "Cena w granicach 30 %",
    hint: "Klient porównuje rzeczy w podobnym progu cenowym.",
  },
  {
    points: SCORE_PRICE_NEAR,
    label: "Cena w granicach 60 %",
    hint: "Zamiast punktów za cenę bliską – nie sumuje się z nimi.",
  },
  {
    points: SCORE_FEATURED,
    label: "Produkt wyróżniony",
    hint: "Zaznaczony jako wyróżniony w formularzu produktu.",
  },
  {
    points: SCORE_DISCOUNTED,
    label: "Trwająca przecena",
    hint: "Rabat produktowy działający w chwili wyświetlenia karty.",
  },
];

/** Gotowe progi do wyboru w panelu – opisane skutkiem, nie samą liczbą. */
export const SIMILARITY_THRESHOLDS: { value: number; label: string }[] = [
  { value: 0, label: "Bez progu – zawsze pokazuj 8 najlepiej dopasowanych" },
  { value: SCORE_PRICE_CLOSE, label: `Co najmniej zbliżona cena (${SCORE_PRICE_CLOSE} pkt)` },
  { value: SCORE_SAME_CATEGORY, label: `Tylko ta sama kategoria lub kolekcja (${SCORE_SAME_CATEGORY} pkt)` },
  { value: SCORE_SAME_COLLECTION, label: `Tylko ta sama kolekcja (${SCORE_SAME_COLLECTION} pkt)` },
];

/** Najwyższy sensowny próg – powyżej niego nic już nie przechodzi. */
export const MAX_SIMILARITY_SCORE =
  SCORE_SAME_COLLECTION + SCORE_SAME_CATEGORY + SCORE_PRICE_CLOSE + SCORE_FEATURED + SCORE_DISCOUNTED;

/** Domyślny próg: bez progu – sekcja ma się pokazywać na każdej karcie. */
export const DEFAULT_MIN_SCORE = 0;

/** Ustawienie z progiem punktowym (panel: Ustawienia → Proponowane). */
export const SIMILAR_MIN_SCORE_KEY = "similar_min_score";

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
    minScore = DEFAULT_MIN_SCORE,
    isDiscounted,
  }: {
    limit?: number;
    /** Próg z panelu: produkt poniżej niego nie trafia do proponowanych. */
    minScore?: number;
    isDiscounted?: (product: SimilarProduct) => boolean;
  } = {},
): SimilarProduct[] {
  return products
    .filter((p) => p.id !== current.id && p.stock > 0)
    .map((product) => ({
      product,
      score: similarityScore(current, product, {
        discounted: isDiscounted?.(product) ?? false,
      }),
    }))
    // Remisy rozstrzyga szum < 1 pkt, więc próg porównujemy do pełnych punktów –
    // inaczej „100 pkt" wpuszczałoby albo odrzucało zależnie od losowej końcówki
    .filter((entry) => Math.floor(entry.score) >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}

/** Próg z ustawień: liczba całkowita 0–`MAX_SIMILARITY_SCORE`, śmieci → default. */
export function normalizeMinScore(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_MIN_SCORE;
  return Math.min(Math.round(parsed), MAX_SIMILARITY_SCORE);
}
