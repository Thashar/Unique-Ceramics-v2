import { getShopProducts } from "@/lib/products";
import { fallbackImage, jpegResponse, loadOwnImage, renderContain } from "@/lib/og-image";

// Podgląd linku strony kategorii: pierwsze zdjęcie pierwszego dostępnego
// produktu z tej kategorii (kolejność jak w katalogu); pusta kategoria dostaje
// domyślną grafikę. Produkty z cache `getShopProducts` – bez osobnego zapytania.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const { inStock, soldOut } = await getShopProducts();
    const product = [...inStock, ...soldOut].find((p) => p.category === slug && p.images[0]);
    const original = await loadOwnImage(product?.images[0], new URL(req.url).origin);
    if (original) return jpegResponse(await renderContain(original));
    return jpegResponse(await fallbackImage());
  } catch (e) {
    console.error(`[api/og/kategoria] ${slug}:`, e);
    return new Response("Not found", { status: 404 });
  }
}
