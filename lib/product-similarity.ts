/**
 * **Wykrywanie wracającego wzoru** w agencie dodawania produktów – czyste
 * funkcje (bez bazy, bez sieci; testy w `tests/product-similarity.test.ts`).
 *
 * Po co: ta sama rzecz bywa robiona drugi raz – ten sam kształt i ten sam
 * motyw, tylko odcień szkliwa albo układ plam wychodzi inaczej. Zamiast
 * zakładać drugą ofertę, lepiej **odświeżyć tamtą** (podmienić zdjęcie główne
 * i wrócić ze stanem magazynowym).
 *
 * Dwie zasady, na których stoi trafność:
 * 1. **Kandydatami są wyłącznie oferty, których dziś nie ma w sklepie**
 *    (`stock = 0` albo `active = false`). Produkt dostępny w sklepie nie może
 *    zostać zaproponowany ani nawet wspomniany – decyzja właściciela
 *    19.09.2026. Przy okazji to najtańszy filtr fałszywych trafień: pula jest
 *    maleńka, a najczęściej pusta, więc sprawdzanie w ogóle się nie odpala.
 * 2. **Tekst tylko zawęża, decyduje obraz.** Nazwa i opis pochodzą z
 *    rozpoznania zdjęcia przez model, więc porównywanie samych nazw
 *    („Kubek z kotem” vs „Kubek z kotem”) to prosta droga do pomyłki.
 *
 * Próg pewności jest **celowo niski** (`DUPLICATE_MIN_CONFIDENCE`), bo decyzję
 * i tak podejmuje właściciel jednym kliknięciem: chybiona propozycja kosztuje
 * kliknięcie „Nie”, a przegapiony duplikat – zbędną ofertę i sprzątanie po
 * czasie. Optymalizujemy więc trafienia, nie czystość listy.
 */

/** Ile ofert idzie do porównania obrazem (decyzja właściciela 19.09.2026). */
export const DUPLICATE_CANDIDATES = 3;

/** Minimalna pewność modelu, przy której w ogóle pytamy właściciela. */
export const DUPLICATE_MIN_CONFIDENCE = 70;

/** Werdykty, które model może zwrócić – trzy, nie „podobne / niepodobne”. */
export const DUPLICATE_VERDICTS = ["ten_sam_wzor", "ta_sama_rodzina", "inny"] as const;
export type DuplicateVerdict = (typeof DUPLICATE_VERDICTS)[number];

export type SimilarityProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: string[];
  stock: number;
  active: boolean;
};

export type DuplicateDraft = { name: string; description: string };

export type DuplicateVerdictRow = {
  index: number;
  verdict: DuplicateVerdict;
  confidence: number;
  /** Cechy, po których model rozpoznał ten sam wzór – ogólniki odrzucamy. */
  matched: string;
  differences: string;
};

/** Słowa zbyt częste, żeby cokolwiek znaczyły przy zawężaniu kandydatów. */
const STOP_WORDS = new Set([
  "ceramiczny", "ceramiczna", "ceramiczne", "ceramika", "recznie", "reczny", "reczna", "reczne",
  "robiony", "robiona", "robione", "wykonany", "wykonana", "wykonane", "produkt", "przedmiot",
  "kolor", "kolorze", "szkliwo", "szkliwem", "szkliwie", "matowy", "matowa", "matowe",
  "jest", "oraz", "tego", "takze", "ktory", "ktora", "ktore", "przez", "bardzo", "swoim",
]);

/** Ogólniki, którymi model zasłania brak konkretu – bez cechy nie ma propozycji. */
const GENERIC_MATCH = [
  "podobny styl", "podobna stylistyka", "ta sama stylistyka", "podobna kolorystyka",
  "ta sama kolorystyka", "podobny wyglad", "ten sam typ", "ta sama kategoria",
  "podobny ksztalt ogolnie", "ogolne podobienstwo",
];

/** Tekst do porównania: małe litery, bez polskich znaków, bez interpunkcji. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Słowa znaczące (≥4 znaki, bez wypełniaczy) – do pokrycia między tekstami. */
export function keywords(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
  );
}

/**
 * Pokrycie słów rozpoznania z nazwą i opisem oferty (0–1). Nazwa waży więcej,
 * bo motyw („z żurawiem”) siedzi właśnie tam.
 */
export function textScore(draft: DuplicateDraft, product: SimilarityProduct): number {
  const draftWords = keywords(`${draft.name} ${draft.description}`);
  if (draftWords.size === 0) return 0;
  const nameWords = keywords(product.name);
  const allWords = keywords(`${product.name} ${product.description}`);
  let hits = 0;
  for (const word of draftWords) {
    if (nameWords.has(word)) hits += 1;
    else if (allWords.has(word)) hits += 0.5;
  }
  return hits / draftWords.size;
}

/** Oferta, której dziś nie ma w sklepie – tylko takie wchodzą do porównania. */
export function isOffShelf(product: SimilarityProduct): boolean {
  return product.stock <= 0 || !product.active;
}

/**
 * Kandydaci do porównania obrazem: wyprzedane i wyłączone oferty ze zdjęciem,
 * ułożone po pokryciu tekstu. Remis rozstrzyga kolejność wejściowa (najnowsze
 * pierwsze), więc wynik jest powtarzalny.
 */
export function pickDuplicateCandidates(
  products: SimilarityProduct[],
  draft: DuplicateDraft,
  limit = DUPLICATE_CANDIDATES
): SimilarityProduct[] {
  return products
    .filter((p) => isOffShelf(p) && p.images.length > 0)
    .map((product, order) => ({ product, order, score: textScore(draft, product) }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, Math.max(0, limit))
    .map((row) => row.product);
}

/**
 * Zdjęcie oferty do porównania: **oryginał przed AI**, jeśli jest. Zdjęcia z
 * modelu stoją w wystylizowanej scenie, a porównujemy sam przedmiot.
 */
export function comparisonImage(product: SimilarityProduct, isAiImage: (url: string) => boolean): string {
  return product.images.find((url) => !isAiImage(url)) ?? product.images[0] ?? "";
}

/** Prompt porównania: jedno zdjęcie nowe + ponumerowane zdjęcia ofert. */
export function buildDuplicatePrompt(draft: DuplicateDraft, candidates: SimilarityProduct[]): string {
  const list = candidates
    .map((c, i) => `Oferta ${i + 1}: ${c.name}${c.description ? ` – ${c.description}` : ""}`)
    .join("\n");
  return `Jesteś asystentem sklepu z ręcznie robioną ceramiką artystyczną (Unique Ceramics).

Cel: właściciel sklepu chce wystawić przedmiot ze **zdjęcia 1**. Sprawdzamy, czy nie jest to
kolejny egzemplarz czegoś, co już kiedyś było w sklepie i się wyprzedało – wtedy zamiast
zakładać nową ofertę, odświeżymy starą. Twoje zadanie to **rozstrzygnąć, czy to ten sam wzór**.

Zdjęcie 1 to nowy przedmiot. Kolejne zdjęcia to zdjęcia ofert z listy poniżej, w tej samej kolejności.
${draft.name ? `\nWstępne rozpoznanie zdjęcia 1: ${draft.name}${draft.description ? ` – ${draft.description}` : ""}\n` : ""}
${list}

Każda rzecz jest robiona ręcznie, więc dwa egzemplarze tego samego wzoru **nigdy nie są identyczne**.

Różnice, które są **dopuszczalne** (to nadal ten sam wzór):
- inny odcień, nasycenie i jasność szkliwa,
- inny układ plam, zacieków, przejść koloru i nakrapiań,
- drobne nierówności kształtu, krzywizny, grubości ścianki,
- inne tło, scena, rekwizyty, kadr, światło i wielkość przedmiotu w kadrze – **te w ogóle się nie liczą**.

Różnice, które **wykluczają** ten sam wzór:
- inny motyw, wizerunek, napis, znak lub jego umiejscowienie,
- inny kształt albo proporcje formy, inna krawędź, inne ucho lub jego brak,
- inna liczba sztuk w komplecie, inny typ przedmiotu.

Dla **każdej** oferty z listy zwróć wiersz:
- "index": numer oferty (1, 2, 3…),
- "verdict": "ten_sam_wzor" (ta sama forma i ten sam motyw), "ta_sama_rodzina" (ten sam typ
  przedmiotu, ale inne zdobienie lub kształt) albo "inny",
- "confidence": liczba 0-100, jak pewny jesteś werdyktu,
- "matched": **konkretne** cechy, po których rozpoznałeś zgodność (motyw, kształt ucha, krawędź,
  rozmieszczenie zdobienia). Bez ogólników w rodzaju "podobny styl" czy "ta sama kolorystyka" –
  taki wiersz zostanie odrzucony. Gdy werdykt to "inny", wpisz pusty ciąg.
- "differences": co się różni między zdjęciami (także dopuszczalne różnice).

W razie wątpliwości wybierz "ta_sama_rodzina" albo "inny" – lepiej nie wskazać wzoru,
niż wskazać zły. Pisz po polsku. Jako myślnika używaj wyłącznie półpauzy "–".

Odpowiedz wyłącznie obiektem JSON, bez komentarzy i bez bloków kodu:
{"results":[{"index":1,"verdict":"inny","confidence":90,"matched":"","differences":"..."}]}`;
}

/** Czy „matched” niesie konkret, czy tylko ogólnik. */
export function hasConcreteMatch(matched: string): boolean {
  const value = normalizeText(matched);
  if (value.length < 8) return false;
  return !GENERIC_MATCH.some((generic) => value === generic || value.startsWith(generic));
}

/** Odczyt odpowiedzi modelu – wiersze spoza zakresu i bez werdyktu wypadają. */
export function parseDuplicateVerdicts(parsed: unknown, count: number): DuplicateVerdictRow[] {
  const rows = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).results : null;
  if (!Array.isArray(rows)) return [];
  const out: DuplicateVerdictRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const index = Number(r.index);
    const verdict = typeof r.verdict === "string" ? r.verdict.trim() : "";
    if (!Number.isInteger(index) || index < 1 || index > count) continue;
    if (!DUPLICATE_VERDICTS.includes(verdict as DuplicateVerdict)) continue;
    const confidence = Number(r.confidence);
    out.push({
      index,
      verdict: verdict as DuplicateVerdict,
      confidence: Number.isFinite(confidence) ? Math.min(100, Math.max(0, confidence)) : 0,
      matched: typeof r.matched === "string" ? r.matched.trim().slice(0, 300) : "",
      differences: typeof r.differences === "string" ? r.differences.trim().slice(0, 300) : "",
    });
  }
  return out;
}

export type DuplicateMatch = { product: SimilarityProduct; row: DuplicateVerdictRow };

/**
 * Jedna propozycja albo żadna – nigdy lista do wybierania. Wiersz musi mieć
 * werdykt „ten sam wzór”, pewność ponad progiem i **nazwane konkretne cechy**.
 */
export function bestDuplicate(
  verdicts: DuplicateVerdictRow[],
  candidates: SimilarityProduct[],
  minConfidence = DUPLICATE_MIN_CONFIDENCE
): DuplicateMatch | null {
  const best = verdicts
    .filter((row) => row.verdict === "ten_sam_wzor")
    .filter((row) => row.confidence >= minConfidence)
    .filter((row) => hasConcreteMatch(row.matched))
    .filter((row) => Boolean(candidates[row.index - 1]))
    .sort((a, b) => b.confidence - a.confidence)[0];
  return best ? { product: candidates[best.index - 1], row: best } : null;
}
