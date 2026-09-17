/**
 * Angielskie wersje treści z bazy – klucze, odczyt i nakładanie na dane.
 *
 * Tłumaczenia **nie mają własnych kolumn ani tabel**. Leżą w `Setting` pod
 * kluczami z prefiksem `en_`:
 *
 * | Klucz                  | Wartość                                   |
 * |------------------------|-------------------------------------------|
 * | `en_{klucz ustawienia}`| tekst (np. `en_home_hero_title`)           |
 * | `en_product_{id}`      | JSON `{ name, description }`               |
 * | `en_category_{id}`     | etykieta kategorii                         |
 * | `en_project_{id}`      | JSON `{ title, description }` (opis = HTML) |
 *
 * Powód: dołożenie kolumn do `Product` wymagałoby ręcznej migracji, a do jej
 * wykonania **każde** zapytanie o produkty padałoby i sklep przestałby się
 * renderować (tak było przy `collection` i `discountPercent`). Klucz w `Setting`
 * nie wymaga żadnej migracji, a brak tłumaczenia = pokazujemy polski oryginał.
 *
 * Moduł neutralny (bez bazy) – używa go serwer (`lib/content-translations.ts`),
 * panel i testy w `tests/i18n-content.test.ts`.
 */

import type { Locale } from "./i18n";

export const EN_KEY_PREFIX = "en_";

export function enSettingKey(key: string): string {
  return `${EN_KEY_PREFIX}${key}`;
}
export function enProductKey(id: string): string {
  return `${EN_KEY_PREFIX}product_${id}`;
}
export function enCategoryKey(id: string): string {
  return `${EN_KEY_PREFIX}category_${id}`;
}
export function enProjectKey(id: string): string {
  return `${EN_KEY_PREFIX}project_${id}`;
}

export type ProductTranslation = { name: string; description: string };
export type ProjectTranslation = { title: string; description: string };

export type EnglishContent = {
  /** `klucz ustawienia` (bez prefiksu) → tekst po angielsku. */
  settings: Record<string, string>;
  products: Record<string, ProductTranslation>;
  /** id kategorii → etykieta. */
  categories: Record<string, string>;
  projects: Record<string, ProjectTranslation>;
};

export const EMPTY_ENGLISH: EnglishContent = {
  settings: {},
  products: {},
  categories: {},
  projects: {},
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Bezpieczny odczyt JSON-a `{ name, description }` / `{ title, description }`. */
function parseObject(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function parseProductTranslation(json: string): ProductTranslation {
  const obj = parseObject(json);
  return { name: str(obj?.name).trim(), description: str(obj?.description) };
}

export function parseProjectTranslation(json: string): ProjectTranslation {
  const obj = parseObject(json);
  return { title: str(obj?.title).trim(), description: str(obj?.description) };
}

/** Wiersze `Setting` z prefiksem `en_` → uporządkowane tłumaczenia. */
export function parseEnglishRows(rows: { key: string; value: string }[]): EnglishContent {
  const out: EnglishContent = { settings: {}, products: {}, categories: {}, projects: {} };
  for (const { key, value } of rows) {
    if (!key.startsWith(EN_KEY_PREFIX)) continue;
    const rest = key.slice(EN_KEY_PREFIX.length);
    if (rest.startsWith("product_")) {
      out.products[rest.slice("product_".length)] = parseProductTranslation(value);
    } else if (rest.startsWith("category_")) {
      out.categories[rest.slice("category_".length)] = value.trim();
    } else if (rest.startsWith("project_")) {
      out.projects[rest.slice("project_".length)] = parseProjectTranslation(value);
    } else {
      out.settings[rest] = value;
    }
  }
  return out;
}

/**
 * Tekst ustawienia w danym języku. Po angielsku bierze `en_{key}`, a gdy
 * właściciel nic nie wpisał:
 * - jeśli polski tekst to **nietknięty domyślny** (`defaults.pl`), oddaje
 *   angielski domyślny z kodu (`defaults.en`) – to jego wierne tłumaczenie;
 * - jeśli właściciel zmienił polski tekst, oddaje **polski oryginał** –
 *   angielski domyślny mówiłby wtedy co innego niż strona po polsku.
 *
 * **Pusty angielski nigdy nie ukrywa elementu** – to robi tylko puste polskie
 * pole, bo tam jest to świadoma decyzja z panelu.
 */
export function localizedSetting(
  locale: Locale,
  key: string,
  settings: Record<string, string>,
  en: EnglishContent,
  defaults?: { pl: string; en: string },
): string {
  const pl = settings[key] ?? "";
  if (locale === "pl") return pl;
  const translated = en.settings[key];
  if (translated && translated.trim()) return translated;
  // Puste polskie pole ukrywa element także po angielsku
  if (!pl.trim()) return "";
  if (defaults && pl === defaults.pl) return defaults.en;
  return pl;
}

/** Produkt z angielską nazwą i opisem, jeśli są; bez nich – polski oryginał. */
export function localizeProduct<T extends { id: string; name: string; description?: string | null }>(
  locale: Locale,
  product: T,
  en: EnglishContent,
): T {
  if (locale === "pl") return product;
  const tr = en.products[product.id];
  if (!tr) return product;
  const out: T = { ...product, name: tr.name || product.name };
  // Opis podmieniamy tylko tam, gdzie produkt w ogóle go niesie (karuzele
  // „podobnych” mają same nazwy)
  if ("description" in product && tr.description.trim()) out.description = tr.description;
  return out;
}

export function localizeCategories<T extends { id: string; label: string }>(
  locale: Locale,
  categories: T[],
  en: EnglishContent,
): T[] {
  if (locale === "pl") return categories;
  return categories.map((c) => {
    const label = en.categories[c.id];
    return label ? { ...c, label } : c;
  });
}

export function localizeProject<T extends { id: string; title: string; description: string }>(
  locale: Locale,
  project: T,
  en: EnglishContent,
): T {
  if (locale === "pl") return project;
  const tr = en.projects[project.id];
  if (!tr) return project;
  return {
    ...project,
    title: tr.title || project.title,
    description: tr.description.trim() ? tr.description : project.description,
  };
}

// ── Tłumaczenie struktur JSON (oferty warsztatów, FAQ, karty „Jak pracuję”) ──

/**
 * Pola, których **nie tłumaczymy** w JSON-ach z panelu: identyfikatory, nazwy
 * ikon, adresy zdjęć i punkty kadrowania. Tłumaczone są wszystkie pozostałe
 * napisy – tytuły, opisy, pytania, odpowiedzi, etykiety czasu i ceny.
 */
export const UNTRANSLATED_JSON_KEYS: ReadonlySet<string> = new Set([
  "id", "iconName", "url", "position", "active", "slug", "image",
]);

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Wszystkie napisy z JSON-a (poza polami z `UNTRANSLATED_JSON_KEYS`)
 * w kolejności przejścia – tę listę wysyłamy modelowi jednym żądaniem.
 */
export function collectStrings(value: JsonValue, skip: ReadonlySet<string> = UNTRANSLATED_JSON_KEYS): string[] {
  const out: string[] = [];
  const walk = (node: JsonValue, key: string | null) => {
    if (typeof node === "string") {
      if (key === null || !skip.has(key)) out.push(node);
    } else if (Array.isArray(node)) {
      node.forEach((item) => walk(item, null));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, k);
    }
  };
  walk(value, null);
  return out;
}

/**
 * Ten sam JSON z napisami podmienionymi na tłumaczenia – w tej samej kolejności,
 * w jakiej zebrał je `collectStrings`. Krótsza lista tłumaczeń zostawia resztę
 * bez zmian, żeby błąd modelu nie zepsuł struktury.
 */
export function replaceStrings(
  value: JsonValue,
  translations: string[],
  skip: ReadonlySet<string> = UNTRANSLATED_JSON_KEYS,
): JsonValue {
  let i = 0;
  const walk = (node: JsonValue, key: string | null): JsonValue => {
    if (typeof node === "string") {
      if (key !== null && skip.has(key)) return node;
      const next = translations[i++];
      return typeof next === "string" ? next : node;
    }
    if (Array.isArray(node)) return node.map((item) => walk(item, null));
    if (node && typeof node === "object") {
      const out: { [key: string]: JsonValue } = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v, k);
      return out;
    }
    return node;
  };
  return walk(value, null);
}
