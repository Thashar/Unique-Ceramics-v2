/**
 * **Wymiary produktu jako osobne pola**, a nie tekst w opisie (decyzja
 * właściciela 19.09.2026).
 *
 * Do tej pory wymiary istniały wyłącznie jako akapit „Wymiary:” w opisie,
 * a etykiety podpowiadał model z dwóch losowych produktów wzorcowych. Skutek:
 * przy każdym produkcie agent pytał o co innego, a z bazy nie dało się
 * odczytać, ile ten kubek realnie ma wysokości. Teraz:
 *
 * - **kategoria** mówi, których wymiarów używa (`category_dims_{id}`),
 * - **produkt** trzyma same wartości (`product_dims_{id}`),
 * - opis w sklepie dalej składa `buildProductDescription` – układ na stronie
 *   się nie zmienia, zmienia się tylko to, skąd biorą się liczby.
 *
 * ⚠️ **Jedno i drugie siedzi w tabeli `Setting`, nie w kolumnach.** Kolumna
 * w `Product` wymagałaby ręcznej migracji, a do czasu jej wykonania **każde**
 * zapytanie o produkty padałoby i sklep przestałby się renderować – ten sam
 * powód, dla którego w `Setting` leżą tłumaczenia `en_product_{id}`.
 *
 * Moduł neutralny (bez bazy i Reacta) – testy w `tests/product-dimensions.test.ts`.
 */

import { normalizeMeasure, type DimensionValue } from "@/lib/product-description";

/**
 * Wymiary, o które sklep pyta. Kolejność jest kolejnością pól w panelu
 * i wierszy w opisie – **nie zależy od tego, jak zaznaczono je w kategorii**,
 * żeby każdy produkt czytało się tak samo.
 *
 * Dokładając wymiar, dopisz go tutaj; reszta (panel, agent, opis) idzie z tej
 * listy. `pojemnosc` jest jedyną pozycją w mililitrach i **w opisie ma własną
 * sekcję „Pojemność:”** – tak wyglądał opis, zanim wymiary stały się polami.
 */
export const DIMENSION_FIELDS = [
  { id: "wysokosc", label: "wysokość", labelEn: "height", unit: "cm", example: "9" },
  { id: "szerokosc", label: "szerokość", labelEn: "width", unit: "cm", example: "12" },
  { id: "dlugosc", label: "długość", labelEn: "length", unit: "cm", example: "18" },
  { id: "srednica-gorna", label: "średnica górna", labelEn: "top diameter", unit: "cm", example: "8" },
  { id: "srednica-podstawki", label: "średnica podstawki", labelEn: "base diameter", unit: "cm", example: "6" },
  { id: "pojemnosc", label: "pojemność", labelEn: "capacity", unit: "ml", example: "300" },
] as const;

export type DimensionId = (typeof DIMENSION_FIELDS)[number]["id"];
export type DimensionField = (typeof DIMENSION_FIELDS)[number];

/** Pole liczone w opisie osobno, jako sekcja „Pojemność:”. */
export const CAPACITY_ID = "pojemnosc" satisfies DimensionId;

/** Kategoria bez własnego ustawienia pyta o to. */
export const DEFAULT_CATEGORY_DIMENSIONS: DimensionId[] = ["wysokosc", "srednica-gorna", CAPACITY_ID];

export function isDimensionId(value: string): value is DimensionId {
  return DIMENSION_FIELDS.some((f) => f.id === value);
}

export function dimensionField(id: DimensionId): DimensionField {
  return DIMENSION_FIELDS.find((f) => f.id === id)!;
}

/** Klucz ustawienia z listą wymiarów kategorii. */
export function categoryDimensionsKey(categoryId: string): string {
  return `category_dims_${categoryId}`;
}

/** Klucz ustawienia z wartościami wymiarów produktu. */
export function productDimensionsKey(productId: string): string {
  return `product_dims_${productId}`;
}

/**
 * Lista wymiarów kategorii. **Pusty wpis to świadomy wybór** („ta kategoria
 * nie ma wymiarów”) i zostaje pusty; dopiero brak wpisu wraca do domyślnych.
 */
export function parseCategoryDimensions(json: string | null | undefined): DimensionId[] {
  if (json === null || json === undefined || json === "") return [...DEFAULT_CATEGORY_DIMENSIONS];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [...DEFAULT_CATEGORY_DIMENSIONS];
  }
  if (!Array.isArray(raw)) return [...DEFAULT_CATEGORY_DIMENSIONS];
  const picked = new Set(raw.filter((v): v is string => typeof v === "string").filter(isDimensionId));
  // Kolejność zawsze z DIMENSION_FIELDS – zaznaczenie nie ustawia kolejności pól
  return DIMENSION_FIELDS.filter((f) => picked.has(f.id)).map((f) => f.id);
}

export function serializeCategoryDimensions(ids: readonly DimensionId[]): string {
  return JSON.stringify(DIMENSION_FIELDS.filter((f) => ids.includes(f.id)).map((f) => f.id));
}

export type DimensionValues = Partial<Record<DimensionId, string>>;

/**
 * Wartości wymiarów produktu. Trzymamy **to, co wpisano** („9”, „8,5”),
 * a nie gotowy tekst – dzięki temu opis da się złożyć od nowa, a wartość
 * porównać między produktami.
 */
export function parseProductDimensions(json: string | null | undefined): DimensionValues {
  if (!json) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const row = raw as Record<string, unknown>;
  const out: DimensionValues = {};
  for (const field of DIMENSION_FIELDS) {
    const value = row[field.id];
    if (typeof value === "string" && value.trim()) out[field.id] = value.trim().slice(0, 40);
    else if (typeof value === "number" && Number.isFinite(value)) out[field.id] = String(value);
  }
  return out;
}

export function serializeProductDimensions(values: DimensionValues): string {
  const out: Record<string, string> = {};
  for (const field of DIMENSION_FIELDS) {
    const value = values[field.id]?.trim();
    if (value) out[field.id] = value.slice(0, 40);
  }
  return JSON.stringify(out);
}

/** Czy cokolwiek wypełniono. */
export function hasDimensions(values: DimensionValues): boolean {
  return DIMENSION_FIELDS.some((f) => Boolean(values[f.id]?.trim()));
}

/**
 * Wartości → klocki dla `buildProductDescription`: wiersze „Wymiary:”
 * i osobna „Pojemność:”. Każda wartość idzie przez `normalizeMeasure`,
 * więc „9” staje się „ok. 9 cm”, a wpisane „ok. 9 cm” zostaje jak jest.
 */
export function describeDimensions(
  values: DimensionValues,
  used: readonly DimensionId[] = DIMENSION_FIELDS.map((f) => f.id)
): { dimensions: DimensionValue[]; capacity: string } {
  const dimensions: DimensionValue[] = [];
  let capacity = "";
  for (const field of DIMENSION_FIELDS) {
    if (!used.includes(field.id)) continue;
    const raw = values[field.id]?.trim();
    if (!raw) continue;
    const value = normalizeMeasure(raw, field.unit);
    if (field.id === CAPACITY_ID) capacity = value;
    else dimensions.push({ label: field.label, value });
  }
  return { dimensions, capacity };
}

/**
 * Wiersz wymiaru gotowy do pokazania na karcie produktu: rozpoznany wymiar
 * (`id` → ikona) albo sam tekst, gdy pochodzi ze starego opisu.
 */
export type DimensionRow = { id: DimensionId | null; label: string; value: string };

/** Etykieta wymiaru w języku strony. */
export function dimensionLabel(field: DimensionField, locale: "pl" | "en" = "pl"): string {
  return locale === "en" ? field.labelEn : field.label;
}

/**
 * Wartości pól → wiersze karty produktu. **Pusta wartość nie daje wiersza** –
 * produkt z samą pojemnością pokazuje samą pojemność, bez pustej wysokości.
 * Kolejność zawsze z `DIMENSION_FIELDS`.
 */
export function dimensionRows(values: DimensionValues, locale: "pl" | "en" = "pl"): DimensionRow[] {
  const prefix = locale === "en" ? "approx." : "ok.";
  const rows: DimensionRow[] = [];
  for (const field of DIMENSION_FIELDS) {
    const raw = values[field.id]?.trim();
    if (!raw) continue;
    rows.push({
      id: field.id,
      label: dimensionLabel(field, locale),
      value: normalizeMeasure(raw, field.unit, prefix),
    });
  }
  return rows;
}

/** Etykieta bez ogonków i wielkich liter – do porównywania nazw ze starych opisów. */
function plainLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Etykieta z opisu → wymiar, czyli ikona przy wierszu. Opisy sprzed pól
 * wymiarów mają tam zwykły tekst („średnica: ok. 8 cm”), więc dopuszczamy
 * skrócone nazwy. Nierozpoznana etykieta dostaje `null` i wiersz z ikoną
 * ogólną – to nadal lepsze niż pominięcie wymiaru.
 */
export function dimensionIdByLabel(label: string): DimensionId | null {
  const plain = plainLabel(label);
  if (!plain) return null;
  for (const field of DIMENSION_FIELDS) {
    if (plain === plainLabel(field.label) || plain === plainLabel(field.labelEn)) return field.id;
  }
  // „średnica podstawki” / „base diameter” musi wygrać z samym „średnica”
  if (plain.includes("podstaw") || plain.includes("base") || plain.includes("stopk")) return "srednica-podstawki";
  if (plain.startsWith("srednic") || plain.includes("diameter")) return "srednica-gorna";
  if (plain.startsWith("wysok") || plain.includes("height")) return "wysokosc";
  if (plain.startsWith("szerok") || plain.includes("width")) return "szerokosc";
  if (plain.startsWith("dlug") || plain.includes("length") || plain.includes("depth")) return "dlugosc";
  if (plain.startsWith("pojemn") || plain.includes("capacity") || plain.includes("volume")) return CAPACITY_ID;
  return null;
}

/**
 * Wiersze odczytane z **opisu** – dla produktów dodanych przed 19.09.2026,
 * które nie mają jeszcze wypełnionych pól wymiarów.
 */
export function rowsFromDescription(
  dimensions: readonly DimensionValue[],
  capacity: string,
  locale: "pl" | "en" = "pl"
): DimensionRow[] {
  const rows: DimensionRow[] = dimensions
    .filter((d) => d.label.trim() && d.value.trim())
    .map((d) => ({
      id: dimensionIdByLabel(d.label),
      label: d.label.trim().replace(/:\s*$/, ""),
      value: d.value.trim(),
    }));
  const capacityValue = capacity.trim();
  if (capacityValue) {
    rows.push({
      id: CAPACITY_ID,
      label: dimensionLabel(dimensionField(CAPACITY_ID), locale),
      value: capacityValue,
    });
  }
  return rows;
}

/**
 * „ok. 8 cm” → „8”. Pola trzymają samą liczbę, więc wartość przeniesiona
 * ze starego opisu musi zgubić przedrostek i jednostkę.
 */
export function rawMeasure(value: string): string {
  return value
    .trim()
    .replace(/^(około|ok\.?|approx\.?|~)\s*/i, "")
    .replace(/\s*(cm|ml)\s*\.?$/i, "")
    .trim();
}
