import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/category-defaults";

export type { Category } from "@/lib/category-defaults";
export { DEFAULT_CATEGORIES } from "@/lib/category-defaults";

export const getCategories = unstable_cache(
  async () => {
    try {
      const cats = await db.category.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
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
}
