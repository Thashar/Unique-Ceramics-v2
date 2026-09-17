import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ProductGallery from "@/components/ui/ProductGallery";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { getProjects } from "@/lib/portfolio";
import { findProjectBySlug, projectPath, projectSlugs } from "@/lib/portfolio-slug";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { metaDescription, ogImage, pageMetadata } from "@/lib/seo";
import { localePath, type Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";
import { englishContentFor } from "@/lib/content-translations";
import { localizeProject } from "@/lib/i18n-content";

/** Opis projektu jest HTML-em z edytora – do metadanych idzie sam tekst. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Ta sama lista dla metadanych i dla strony – `cache` deduplikuje odczyt.
// Slug liczymy **z polskiego tytułu** także na `/en`, żeby adres projektu był
// ten sam w obu językach; tłumaczenie nakładamy dopiero na znaleziony projekt
const loadProject = cache(async (slug: string, locale: Locale) => {
  const projects = await getProjects();
  const project = findProjectBySlug(projects, slug);
  return project ? localizeProject(locale, project, await englishContentFor(locale)) : null;
});

export async function projectStaticParams() {
  const projects = await getProjects();
  const slugs = projectSlugs(projects);
  return projects.map((p) => ({ slug: slugs.get(p.id) ?? p.id }));
}

export async function projectMetadata(slug: string, locale: Locale): Promise<Metadata> {
  const d = t(locale);
  const project = await loadProject(slug, locale);
  if (!project) return { title: d.meta.projectMissing, robots: { index: false, follow: false } };

  const description = metaDescription(
    plainText(project.description) || d.projects.defaultDescription(project.title),
  );

  // Podgląd linku = pierwsze zdjęcie projektu jako JPEG (zdjęcia są w WebP,
  // którego WhatsApp nie renderuje) – dorabia je `/api/og/projekt/[slug]`
  return pageMetadata({
    title: project.title,
    description,
    path: projectPath(slug),
    ...(project.images[0] ? { image: ogImage(`/api/og/projekt/${slug}`, project.title) } : {}),
    locale,
  });
}

/** Strona projektu – wspólna dla `/moje-projekty/[slug]` i `/en/moje-projekty/[slug]`. */
export default async function ProjectPage({ slug, locale = "pl" }: { slug: string; locale?: Locale }) {
  const d = t(locale);
  const project = await loadProject(slug, locale);
  if (!project) notFound();

  return (
    <>
      <BreadcrumbSchema
        locale={locale}
        items={[
          { name: d.nav.projects, path: "/moje-projekty" },
          { name: project.title, path: projectPath(slug) },
        ]}
      />
      <Header locale={locale} />
      <main className="min-h-[100svh] bg-warm-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-2">
          {/* Okruszki jak na karcie produktu – tytuł dopiero od `sm:`,
              na telefonie łamałby się na drugi wiersz */}
          <nav aria-label={d.common.breadcrumbs}>
            <ol className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay">
              <li>
                <Link href={localePath(locale, "/moje-projekty")} className="hover:text-espresso transition-colors">
                  {d.nav.projects}
                </Link>
              </li>
              <li aria-hidden="true" className="hidden sm:block text-charcoal/80">/</li>
              <li className="hidden sm:block text-charcoal/80 truncate max-w-xs">
                {project.title}
              </li>
            </ol>
          </nav>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Galeria – ten sam komponent co na karcie produktu (kadr 4/3,
              miniatury, podgląd z powiększeniem) */}
          <ProductGallery images={project.images} name={project.title} />

          {/* Opis. Bez ceny, dostępności, wysyłki i pozostałych informacji
              zakupowych – projekt nie jest towarem z magazynu, tylko przykładem
              pracy, którą można zamówić na miarę */}
          <div className="lg:pt-4 flex flex-col">
            <p className="text-xs tracking-[0.25em] uppercase text-clay mb-3">{d.projects.eyebrow}</p>
            <h1 className="font-serif text-3xl md:text-4xl text-espresso leading-tight mb-6">
              {project.title}
            </h1>

            {project.description && (
              <div
                className="rich-content rich-content-sm mb-8"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(project.description) }}
              />
            )}

            <div className="mt-auto pt-2">
              <Link
                href={localePath(locale, "/zamowienie-indywidualne")}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors group rounded-md"
              >
                {d.projects.orderCustom}
                <ArrowRight
                  size={15}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <p className="text-xs text-charcoal/80 mt-3">{d.projects.orderNote}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
