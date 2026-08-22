export type Category = { id: string; slug: string; label: string; order: number };

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "_kubki",   slug: "kubki",   label: "Kubki",   order: 0 },
  { id: "_miski",   slug: "miski",   label: "Miski",   order: 1 },
  { id: "_wazy",    slug: "wazy",    label: "Wazy",    order: 2 },
  { id: "_talerze", slug: "talerze", label: "Talerze", order: 3 },
  { id: "_inne",    slug: "inne",    label: "Inne",    order: 4 },
];

/**
 * Nazwa kategorii do wyświetlenia. `Product.category` trzyma **slug**
 * (`swieczniki`, `miski-i-naczynia`), a ten z definicji nie ma polskich znaków
 * ani spacji – pokazywanie go wprost gubiło ogonki w nazwie kategorii.
 * Nieznany slug (kategoria usunięta po przypisaniu produktu) zamieniamy tylko
 * na czytelny tekst, żeby karta produktu nie została z pustym miejscem.
 */
export function categoryLabel(
  slug: string,
  categories: { slug: string; label: string }[]
): string {
  return categories.find((c) => c.slug === slug)?.label ?? slug.replace(/-/g, " ");
}
