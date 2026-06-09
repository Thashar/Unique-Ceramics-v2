import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

/**
 * Katalog sklepu cache'owany 60 s pod tagiem "products".
 * Strona /sklep czyta searchParams (rendering dynamiczny), więc cache na
 * poziomie zapytania zdejmuje ruch z bazy; mutacje w adminie unieważniają tag.
 */
export const getShopProducts = unstable_cache(
  async () => {
    const inStock = await db.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    const soldOut = await db.product.findMany({
      where: { active: true, stock: { lte: 0 } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    return { inStock, soldOut };
  },
  ["shop-products"],
  { revalidate: 60, tags: ["products"] }
);

/** Odśwież cache stron prezentujących produkty po każdej mutacji w adminie */
export function revalidateProductPages() {
  revalidateTag("products", "max");
  revalidatePath("/");
  revalidatePath("/sklep", "layout");
  revalidatePath("/sitemap.xml");
}
