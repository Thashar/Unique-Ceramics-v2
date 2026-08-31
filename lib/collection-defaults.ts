/**
 * Kolekcje produktów (serie) – typ i helper wyświetlania, bez Prismy.
 * Komponenty klienckie importują `collectionLabel` **stąd**, nie z
 * `lib/collections.ts` (ten ciągnie bazę) – ta sama zasada co przy kategoriach.
 */

export type Collection = { id: string; slug: string; label: string; order: number };

/**
 * Nazwa kolekcji do wyświetlenia. `Product.collection` trzyma **slug**, więc
 * pokazywanie go wprost gubiłoby polskie znaki. Nieznany slug (kolekcja
 * usunięta po przypisaniu) zamieniamy na czytelny tekst zamiast zostawiać puste
 * miejsce. `null` = produkt nie należy do żadnej kolekcji.
 */
export function collectionLabel(
  slug: string | null | undefined,
  collections: { slug: string; label: string }[]
): string {
  if (!slug) return "";
  return collections.find((c) => c.slug === slug)?.label ?? slug.replace(/-/g, " ");
}
