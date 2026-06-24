import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

/**
 * Katalog sklepu cache'owany 60 s pod tagiem "products".
 * Strona /sklep czyta searchParams (rendering dynamiczny), więc cache na
 * poziomie zapytania zdejmuje ruch z bazy; mutacje w adminie unieważniają tag.
 * Jedno zapytanie do DB — podział na inStock/soldOut w JS.
 */
export const getShopProducts = unstable_cache(
  async () => {
    const products = await db.product.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    return {
      inStock: products.filter((p) => p.stock > 0),
      soldOut:  products.filter((p) => p.stock <= 0),
    };
  },
  ["shop-products"],
  { revalidate: 60, tags: ["products"] }
);

/**
 * Wyróżnione produkty na stronie głównej — cache 3600 s, inwalidowany
 * przez revalidateProductPages() po każdej mutacji w adminie.
 */
export const getFeaturedProducts = unstable_cache(
  async () =>
    db.product.findMany({
      where: { featured: true, active: true, stock: { gt: 0 } },
      orderBy: { createdAt: "desc" },
    }),
  ["featured-products"],
  { revalidate: 3600, tags: ["products"] }
);

/** Odśwież cache stron prezentujących produkty po każdej mutacji w adminie */
export function revalidateProductPages() {
  revalidateTag("products", "max");
  revalidatePath("/");
  revalidatePath("/sklep", "layout");
  revalidatePath("/sitemap.xml");
}
