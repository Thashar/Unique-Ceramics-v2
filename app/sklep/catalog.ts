import { getShopProducts } from "@/lib/products";
import { DISCOUNT_HOLD_CATALOG_MS, activeDiscountPercent } from "@/lib/product-price";

export type CatalogProduct = Awaited<ReturnType<typeof getShopProducts>>["inStock"][0];

/**
 * Produkty katalogu w kolejności „najpierw dostępne, potem wyprzedane",
 * z rabatem rozstrzygniętym **na serwerze**. Wspólne dla `/sklep`
 * i stron kategorii, żeby obie listy liczyły to samo.
 *
 * `holdMs` = okno ISR strony: rabatu kończącego się w czasie życia zapisanego
 * HTML-a nie reklamujemy, bo `/api/checkout` już by go nie policzył.
 */
export async function loadCatalog(
  categorySlug?: string
): Promise<{ products: CatalogProduct[]; dbError: boolean }> {
  try {
    const { inStock, soldOut } = await getShopProducts();
    const matches = categorySlug
      ? (p: CatalogProduct) => p.category === categorySlug
      : () => true;

    const products = [...inStock.filter(matches), ...soldOut.filter(matches)].map((p) => ({
      ...p,
      discountPercent: activeDiscountPercent(p, { holdMs: DISCOUNT_HOLD_CATALOG_MS }),
    }));

    return { products, dbError: false };
  } catch (e) {
    console.error("DB error w katalogu:", e);
    return { products: [], dbError: true };
  }
}
