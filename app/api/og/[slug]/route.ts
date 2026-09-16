import { db } from "@/lib/db";
import { jpegResponse, loadOwnImage, renderContain } from "@/lib/og-image";

// Podgląd linku produktu: pierwsze zdjęcie (`images[0]`) jako JPEG 1200×630
// – WhatsApp nie renderuje WebP, w którym trzymamy zdjęcia. Reszta stron ma
// własne trasy obok (`strona/`, `kategoria/`, `projekt/`); wspólny kod
// w `lib/og-image.ts`.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let imageUrl: string | undefined;
  try {
    const product = await db.product.findUnique({
      where: { slug, active: true },
      select: { images: true },
    });
    imageUrl = product?.images[0];
  } catch (e) {
    console.error("[api/og] odczyt produktu:", e);
  }

  const original = await loadOwnImage(imageUrl, new URL(req.url).origin);
  if (!original) return new Response("Not found", { status: 404 });

  try {
    // `contain`, nie `cover` – lepiej dołożyć tło niż obciąć produkt w kadrze
    return jpegResponse(await renderContain(original), 86400);
  } catch (e) {
    console.error("[api/og] przygotowanie zdjęcia:", e);
    return new Response("Not found", { status: 404 });
  }
}
