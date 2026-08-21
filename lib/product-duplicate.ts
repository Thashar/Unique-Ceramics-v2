// Przygotowanie kopii produktu (przycisk „Duplikuj" na liście w panelu admina).
// Neutralny moduł bez dostępu do bazy – zajęte slugi podaje strona, która
// robi zapytanie. Dzięki temu logika nazewnictwa jest w jednym miejscu
// i nie trzeba jej powtarzać przy każdym wywołaniu.

/** Dopisek do nazwy kopii – widoczny w panelu, do zmiany przed zapisem. */
const NAME_SUFFIX = " (kopia)";
/** Człon slugu odróżniający kopię od oryginału. */
export const DUPLICATE_SLUG_SUFFIX = "kopia";

/** Limity z `validateProduct` – kopia musi się w nich zmieścić. */
const MAX_NAME = 200;
const MAX_SLUG = 200;

/** Nazwa kopii: „Kubek" → „Kubek (kopia)", przycięta do limitu nazwy. */
export function duplicateName(name: string): string {
  const withSuffix = `${name}${NAME_SUFFIX}`;
  if (withSuffix.length <= MAX_NAME) return withSuffix;
  return `${name.slice(0, MAX_NAME - NAME_SUFFIX.length).trimEnd()}${NAME_SUFFIX}`;
}

/** Slug bazowy kopii (bez sprawdzania zajętości): „kubek" → „kubek-kopia". */
export function duplicateSlugBase(slug: string): string {
  const base = `${slug}-${DUPLICATE_SLUG_SUFFIX}`;
  return base.length <= MAX_SLUG ? base : base.slice(0, MAX_SLUG).replace(/-+$/, "");
}

/**
 * Pierwszy wolny slug: „kubek-kopia", „kubek-kopia-2", „kubek-kopia-3"...
 * Kopiowanie tego samego produktu kilka razy nie może kończyć się błędem
 * „Slug już istnieje" przy zapisie.
 */
export function nextFreeSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  // Skrajny przypadek – slug i tak jest do zmiany w formularzu przed zapisem
  return `${base}-${Date.now()}`;
}
