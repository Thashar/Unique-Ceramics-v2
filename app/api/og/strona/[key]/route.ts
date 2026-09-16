import { getSettings } from "@/lib/settings";
import { fallbackImage, jpegResponse, loadOwnImage, renderCover } from "@/lib/og-image";

// Podgląd linku strony z nagłówkiem: zdjęcie hero z ustawień panelu,
// wykadrowane (`cover`) z tym samym punktem kadrowania, którego używa strona.
// `glowna` jest zarazem domyślnym obrazkiem wszystkich stron bez własnego
// nagłówka (sklep, kontakt, regulamin…) – patrz `OG_IMAGE` w `lib/seo.ts`.
// Bez wgranego zdjęcia trasa oddaje statyczną `OpenGraph.jpg`, więc podgląd
// nigdy nie jest pusty.

const PAGES: Record<string, { image: string; position: string }> = {
  glowna: { image: "home_hero_image", position: "home_hero_position" },
  "o-mnie": { image: "about_hero_image", position: "about_hero_position" },
  warsztaty: { image: "workshops_hero_image", position: "workshops_hero_position" },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const page = PAGES[key];
  if (!page) return new Response("Not found", { status: 404 });

  try {
    const s = await getSettings([page.image, page.position]);
    const original = await loadOwnImage(s[page.image], new URL(req.url).origin);
    if (original) return jpegResponse(await renderCover(original, s[page.position]));
    return jpegResponse(await fallbackImage());
  } catch (e) {
    console.error(`[api/og/strona] ${key}:`, e);
    try {
      return jpegResponse(await fallbackImage(), 300);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
}
