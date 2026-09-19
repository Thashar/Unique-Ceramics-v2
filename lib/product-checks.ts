/**
 * **Kontrola karty produktu przed zapisem** – czyste funkcje (bez bazy i bez
 * modelu; testy w `tests/product-checks.test.ts`).
 *
 * Agent dodawania produktów składa kartę z kilku wywołań modelu i odpowiedzi
 * właściciela. Każde z nich może pójść nie tak: model przepisze nazwę wzorca,
 * zostawi w opisie znacznik albo dwa razy wklei wymiary, a właściciel pominie
 * cenę i włączy produkt. **Ostatni krok przed zapisem sprawdza to wszystko
 * deterministycznie** – bez pytania modelu, więc za darmo i powtarzalnie.
 *
 * Podział ról:
 * - `repairProduct` naprawia to, co da się naprawić **bez pytania** (spacje,
 *   duplikaty zdjęć, zły slug, nadmiar zdjęć) – autonomia tam, gdzie nie ma
 *   o co pytać,
 * - `checkProduct` zwraca to, czego naprawić nie wolno samemu: `error`
 *   zatrzymuje zapis i wskazuje **krok, do którego agent umie wrócić**
 *   (`step`), a `warning` tylko mówi, co jest niepełne.
 */

import { PRODUCT_MAX_IMAGES } from "@/lib/product-validation";
import { normalizeText } from "@/lib/product-similarity";

/**
 * Kroki przebiegu, do których właściciel może **kazać agentowi wrócić**
 * („zmień cenę”, „wróć do kategorii”). Kolejność jest kolejnością pytań.
 */
export const PRODUCT_STEPS = [
  { id: "kategoria", label: "kategoria" },
  { id: "nazwa", label: "nazwa" },
  { id: "cena", label: "cena" },
  { id: "sztuki", label: "liczba sztuk" },
  { id: "kolekcja", label: "kolekcja" },
  { id: "wymiary", label: "wymiary" },
  { id: "pojemnosc", label: "pojemność" },
] as const;

export type StepId = (typeof PRODUCT_STEPS)[number]["id"];

export function isStepId(value: string): value is StepId {
  return PRODUCT_STEPS.some((s) => s.id === value);
}

export function stepLabel(id: StepId): string {
  return PRODUCT_STEPS.find((s) => s.id === id)?.label ?? id;
}

export type ProductCheckInput = {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  active: boolean;
  /** Nazwy produktów wzorcowych z kategorii – nazwa nie może być ich kopią. */
  examples: string[];
  /** Wymiary zebrane od właściciela (pusta wartość = pominięty). */
  dimensions: { label: string; value: string }[];
  english: { name: string; description: string } | null;
};

export type Issue = {
  level: "error" | "warning";
  message: string;
  /** Krok, do którego agent umie wrócić, żeby to poprawić. */
  step: StepId | null;
};

/** Slug produktu – ten sam wzorzec, co w walidacji serwerowej. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** Nazwa, która nie mieści się na kafelku katalogu bez łamania na trzy wiersze. */
const NAME_SOFT_LIMIT = 90;

/** Pauza (em dash) – w sklepie obowiązuje półpauza. */
const EM_DASH = /[—―]/;

/** Znacznik zostawiony przez model („{wymiary}”, „[cena]”). */
const LEFTOVER_PLACEHOLDER = /[{[][^}\]\n]{2,40}[}\]]/;

function slugify(name: string): string {
  return normalizeText(name).replace(/\s+/g, "-").slice(0, 200);
}

/**
 * Naprawy, których agent dokonuje **sam**: przycięcie spacji, usunięcie
 * powtórzonych zdjęć (kolejność zostaje – pierwsze zdjęcie jest główne),
 * przycięcie do limitu i odtworzenie sluga z nazwy, gdy jest pusty albo ma
 * niedozwolone znaki. Zwraca poprawione dane i listę tego, co zmieniono.
 */
export function repairProduct(input: ProductCheckInput): { input: ProductCheckInput; fixes: string[] } {
  const fixes: string[] = [];
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name !== input.name) fixes.push("przyciąłem zbędne spacje w nazwie");

  const description = input.description.trim();
  if (description !== input.description) fixes.push("przyciąłem zbędne spacje w opisie");

  const seen = new Set<string>();
  const images = input.images.filter((url) => {
    const clean = url.trim();
    if (!clean || seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
  if (images.length !== input.images.length) fixes.push("usunąłem powtórzone zdjęcia");

  const capped = images.slice(0, PRODUCT_MAX_IMAGES);
  if (capped.length !== images.length) fixes.push(`zostawiłem ${PRODUCT_MAX_IMAGES} pierwszych zdjęć (limit karty)`);

  let slug = input.slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    slug = slugify(name);
    if (slug) fixes.push(`poprawiłem adres produktu na „${slug}”`);
  }

  return { input: { ...input, name, description, images: capped, slug }, fixes };
}

/**
 * Lista zastrzeżeń do karty. `error` zatrzymuje zapis (agent pyta, czy
 * poprawić, czy zapisać mimo to), `warning` jest tylko wypisywany.
 */
export function checkProduct(input: ProductCheckInput): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Issue["level"], message: string, step: StepId | null = null) =>
    issues.push({ level, message, step });

  // ── Nazwa ──
  if (!input.name) add("error", "Produkt nie ma nazwy.", "nazwa");
  const named = normalizeText(input.name);
  if (named && input.examples.some((e) => normalizeText(e) === named)) {
    add("error", `Nazwa „${input.name}” jest dokładnie taka sama jak istniejący produkt w tej kategorii.`, "nazwa");
  }
  if (input.name.length > NAME_SOFT_LIMIT) {
    add("warning", `Nazwa ma ${input.name.length} znaków – na kafelku w katalogu będzie się łamać.`, "nazwa");
  }

  // ── Adres ──
  if (!SLUG_PATTERN.test(input.slug)) {
    add("error", "Adres produktu (slug) jest pusty albo ma niedozwolone znaki.", "nazwa");
  }

  // ── Opis ──
  if (!input.description) {
    add("error", "Opis jest pusty.", null);
  } else {
    // Model potrafił wkleić blok wymiarów drugi raz – karta pokazywała je dwa razy
    if ((input.description.match(/Wymiary:/g) ?? []).length > 1) {
      add("error", "Opis zawiera sekcję „Wymiary:” więcej niż raz.", "wymiary");
    }
    if ((input.description.match(/Pojemność:/g) ?? []).length > 1) {
      add("error", "Opis zawiera sekcję „Pojemność:” więcej niż raz.", "pojemnosc");
    }
    if (LEFTOVER_PLACEHOLDER.test(input.description)) {
      add("error", "W opisie został znacznik w nawiasach – model nie podstawił wartości.", null);
    }
    if (EM_DASH.test(input.description) || EM_DASH.test(input.name)) {
      add("error", "W treści jest długi myślnik – w sklepie używamy półpauzy „–”.", null);
    }
  }

  // ── Zdjęcia ──
  if (input.images.length === 0) add("error", "Karta nie ma ani jednego zdjęcia.", null);

  // ── Liczby ──
  if (input.price <= 0) add("warning", "Cena jest zerowa – produkt nie może być aktywny.", "cena");
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    add("error", "Liczba sztuk nie jest poprawną liczbą całkowitą.", "sztuki");
  } else if (input.stock === 0) {
    add("warning", "Stan magazynowy to 0 szt. – produkt nie może być aktywny.", "sztuki");
  }
  if (input.active && (input.price <= 0 || input.stock <= 0)) {
    add("error", "Produkt ma być aktywny, ale nie ma ceny albo sztuk.", input.price <= 0 ? "cena" : "sztuki");
  }

  // ── Uzupełnienia ──
  if (input.dimensions.length > 0 && input.dimensions.every((d) => !d.value)) {
    add("warning", "Żaden wymiar nie został podany – karta nie powie klientowi, jak duży jest przedmiot.", "wymiary");
  }
  if (!input.english || !input.english.name || !input.english.description) {
    add("warning", "Wersja angielska jest niepełna – uzupełnisz ją w zakładce EN produktu.", null);
  }

  return issues;
}

/** Same błędy – to one zatrzymują zapis. */
export function errorsOf(issues: Issue[]): Issue[] {
  return issues.filter((i) => i.level === "error");
}
