import { unstable_cache, revalidateTag } from "next/cache";
import { db, withDbRetry } from "@/lib/db";

export type { Collection } from "@/lib/collection-defaults";
export { collectionLabel } from "@/lib/collection-defaults";

/**
 * Kolekcje produktów (serie) – lista z panelu, cache pod tagiem `collections`.
 *
 * W odróżnieniu od kategorii **nie mają wartości domyślnych**: sklep bez
 * kolekcji działa normalnie, a produkt bez przypisania po prostu nie należy do
 * żadnej serii. Odczyt jest w try/catch, bo migracja tabeli jest ręczna – jej
 * brak nie może wywrócić sklepu (kolekcje są wtedy po prostu puste).
 */
export const getCollections = unstable_cache(
  async () => {
    try {
      return await withDbRetry(() =>
        db.collection.findMany({
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        })
      );
    } catch {
      return [];
    }
  },
  ["collections"],
  { tags: ["collections"] }
);

export function revalidateCollections() {
  revalidateTag("collections", "max");
}
