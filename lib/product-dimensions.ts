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
  { id: "wysokosc", label: "wysokość", unit: "cm", example: "9" },
  { id: "szerokosc", label: "szerokość", unit: "cm", example: "12" },
  { id: "dlugosc", label: "długość", unit: "cm", example: "18" },
  { id: "srednica-gorna", label: "średnica górna", unit: "cm", example: "8" },
  { id: "pojemnosc", label: "pojemność", unit: "ml", example: "300" },
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
