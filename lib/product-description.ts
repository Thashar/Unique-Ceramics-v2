/**
 * Składanie opisu produktu w agencie dodawania produktów – **stały układ**,
 * niezależny od humoru modelu (decyzja właściciela 17.09.2026, po tym jak model
 * wkleił wymiary dwa razy i zostawił znacznik w tekście):
 *
 *     {opis – najwyżej dwa zdania}
 *
 *     {zdanie o wypale – tylko gdy występuje we wzorach}
 *
 *     Wymiary:
 *     średnica górna: ok. 8 cm
 *     wysokość: ok. 9 cm
 *
 *     Pojemność:
 *     ok. 300 ml
 *
 * Model oddaje same klocki (opis, zdanie o wypale, etykiety wymiarów z wzorów),
 * wartości podaje właściciel w rozmowie, a układ składa `buildProductDescription`.
 * Moduł neutralny (bez bazy i Reacta) – testy w `tests/product-description.test.ts`.
 */

export type DimensionValue = { label: string; value: string };

export type DescriptionParts = {
  /** Opis właściwy – najwyżej dwa zdania. */
  description: string;
  /** Zdanie o temperaturze wypału (puste = pomijane). */
  firingNote?: string;
  /** Wymiary w kolejności z wzorów; pusta wartość pomija wiersz. */
  dimensions?: DimensionValue[];
  /** Pojemność (puste = sekcja pomijana). */
  capacity?: string;
};

/**
 * Wartość wymiaru wpisana w rozmowie → „ok. 8 cm”. Sama liczba dostaje jednostkę,
 * „8cm” odstęp, brak „ok.” jest dokładany. Pauzy zamieniane na półpauzy.
 */
export function normalizeMeasure(raw: string, unit: "cm" | "ml"): string {
  let v = raw.trim().replace(/[—―]/g, "–").replace(/\s+/g, " ");
  if (!v) return "";
  v = v.replace(/^(około|ok\.?|approx\.?|~)\s*/i, "");
  // „8” → „8 cm”, „8cm” → „8 cm”, „8,5 x 12” → zostaje jak jest + cm
  if (/^[\d.,]+(\s*[x×–-]\s*[\d.,]+)*$/.test(v)) v = `${v} ${unit}`;
  v = v.replace(/(\d)(cm|ml)\b/gi, "$1 $2");
  return `ok. ${v}`;
}

/** Etykieta wymiaru z wzorów → mała litera na początku, bez dwukropka. */
export function normalizeLabel(label: string): string {
  const clean = label.trim().replace(/:\s*$/, "");
  return clean ? clean.charAt(0).toLowerCase() + clean.slice(1) : "";
}

/** Domyślne etykiety, gdy wzory nie podają wymiarów, a właściciel chce je dodać. */
export const DEFAULT_DIMENSION_LABELS = ["średnica", "wysokość"];

export function buildProductDescription(parts: DescriptionParts): string {
  const blocks: string[] = [];
  const description = parts.description.trim();
  if (description) blocks.push(description);

  const firing = parts.firingNote?.trim();
  if (firing) blocks.push(firing);

  const dims = (parts.dimensions ?? [])
    .map((d) => ({ label: normalizeLabel(d.label), value: d.value.trim() }))
    .filter((d) => d.label && d.value);
  if (dims.length > 0) {
    blocks.push(["Wymiary:", ...dims.map((d) => `${d.label}: ${d.value}`)].join("\n"));
  }

  const capacity = parts.capacity?.trim();
  if (capacity) blocks.push(`Pojemność:\n${capacity}`);

  return blocks.join("\n\n");
}
