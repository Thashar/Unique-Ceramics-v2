import { getProjects } from "@/lib/portfolio";
import { findProjectBySlug } from "@/lib/portfolio-slug";
import { fallbackImage, jpegResponse, loadOwnImage, renderContain } from "@/lib/og-image";

// Podgląd linku projektu portfolio: pierwsze zdjęcie projektu. Slug jest
// liczony z tytułu (`lib/portfolio-slug.ts`), więc dopasowujemy tak samo jak
// strona projektu – łącznie z zapasowym dopasowaniem po `id`.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const project = findProjectBySlug(await getProjects(), slug);
    if (!project) return new Response("Not found", { status: 404 });
    const original = await loadOwnImage(project.images[0], new URL(req.url).origin);
    if (original) return jpegResponse(await renderContain(original));
    return jpegResponse(await fallbackImage());
  } catch (e) {
    console.error(`[api/og/projekt] ${slug}:`, e);
    return new Response("Not found", { status: 404 });
  }
}
