import sharp from "sharp";
import { db } from "@/lib/db";
import { resolveOwnImageSource, fetchOwnImage } from "@/lib/image-source";

// Podgląd linku (WhatsApp, Discord, Messenger, Facebook) potrzebuje zdjęcia
// w formacie, który każdy z nich rozumie. Zdjęcia produktów trzymamy w WebP,
// a WhatsApp go nie renderuje – dlatego ta trasa oddaje JPEG 1200×630.

/** Standardowy kadr podglądu linku – 1,91:1. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Tło uzupełniające kadr (produkty są pionowe) – `cream` z palety sklepu. */
const BACKGROUND = { r: 245, g: 240, b: 232 };

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

  if (!imageUrl) return new Response("Not found", { status: 404 });

  const source = resolveOwnImageSource(imageUrl, new URL(req.url).origin);
  if (!source) return new Response("Not found", { status: 404 });

  try {
    const original = await fetchOwnImage(source);
    const jpeg = await sharp(original)
      // `contain`, nie `cover` – lepiej dołożyć tło niż obciąć produkt w kadrze
      .resize({
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fit: "contain",
        background: BACKGROUND,
      })
      .jpeg({ quality: 82 })
      .toBuffer();

    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        // Podglądy są cache'owane po stronie komunikatorów; krótkie s-maxage
        // wystarczy, żeby zmiana zdjęcia produktu weszła w rozsądnym czasie
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    console.error("[api/og] przygotowanie zdjęcia:", e);
    return new Response("Not found", { status: 404 });
  }
}
