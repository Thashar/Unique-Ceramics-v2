import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

export type Category = { id: string; slug: string; label: string; order: number };

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "_kubki",   slug: "kubki",   label: "Kubki",   order: 0 },
  { id: "_miski",   slug: "miski",   label: "Miski",   order: 1 },
  { id: "_wazy",    slug: "wazy",    label: "Wazy",    order: 2 },
  { id: "_talerze", slug: "talerze", label: "Talerze", order: 3 },
  { id: "_inne",    slug: "inne",    label: "Inne",    order: 4 },
];

export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
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
