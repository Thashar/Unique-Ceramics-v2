import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { db, withDbRetry } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/category-defaults";
import { getSettings } from "@/lib/settings";
import {
  categoryDimensionsKey,
  parseCategoryDimensions,
  type DimensionId,
} from "@/lib/product-dimensions";

export type { Category } from "@/lib/category-defaults";
export { DEFAULT_CATEGORIES, categoryLabel } from "@/lib/category-defaults";

export const getCategories = unstable_cache(
  async () => {
    try {
      const cats = await withDbRetry(() =>
        db.category.findMany({
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        })
      );
      return cats.length > 0 ? cats : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },
  ["categories"],
  { tags: ["categories"] }
);

export function revalidateCategories() {
  revalidateTag("categories", "max");
  // Strony kategorii są w sitemapie – nowa kategoria ma w niej być od razu
  revalidatePath("/sitemap.xml");
}

/**
 * **Wymiary używane przez każdą kategorię** (slug → pola), z ustawień
 * `category_dims_{id}`. Potrzebują ich formularz produktu i agent dodawania
 * produktów, więc czytamy je jednym zapytaniem dla wszystkich kategorii.
 *
 * Kategoria bez wpisu dostaje `DEFAULT_CATEGORY_DIMENSIONS`; pusta lista
 * w ustawieniu to świadomy wybór („ta kategoria nie ma wymiarów”) i zostaje
 * pusta. Odczyt idzie przez `getSettings`, który przy niedostępnej bazie
 * oddaje puste wartości – brak podpowiedzi nie może zablokować panelu.
 */
export async function getCategoryDimensions(
  categories: { id: string; slug: string }[]
): Promise<Record<string, DimensionId[]>> {
  if (categories.length === 0) return {};
  const rows = await getSettings(categories.map((c) => categoryDimensionsKey(c.id)));
  return Object.fromEntries(
    categories.map((c) => [c.slug, parseCategoryDimensions(rows[categoryDimensionsKey(c.id)])])
  );
}
