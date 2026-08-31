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
import { metaDescription, pageMetadata } from "@/lib/seo";

export const revalidate = 300;

/** Opis projektu jest HTML-em z edytora – do metadanych idzie sam tekst. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Ta sama lista dla metadanych i dla strony – `cache` deduplikuje odczyt
const loadProject = cache(async (slug: string) => {
  const projects = await getProjects();
  return findProjectBySlug(projects, slug);
});

export async function generateStaticParams() {
  const projects = await getProjects();
  const slugs = projectSlugs(projects);
  return projects.map((p) => ({ slug: slugs.get(p.id) ?? p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await loadProject(slug);
  if (!project) return { title: "Projekt nie istnieje", robots: { index: false, follow: false } };

  const description = metaDescription(
    plainText(project.description) ||
      `${project.title} – ręcznie wykonana praca z pracowni ceramicznej Unique Ceramics.`,
  );

  // Podgląd linku zostaje domyślny (`/images/OpenGraph.jpg`): zdjęcia projektów
  // są w WebP, którego WhatsApp nie renderuje w podglądach – tak samo jak przy
  // produktach, gdzie JPEG-a dorabia `/api/og/[slug]`
  return pageMetadata({
    title: project.title,
    description,
    path: projectPath(slug),
  });
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await loadProject(slug);
  if (!project) notFound();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Moje projekty", path: "/moje-projekty" },
          { name: project.title, path: projectPath(slug) },
        ]}
      />
      <Header />
      <main className="min-h-[100svh] bg-warm-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-6 pb-2">
          {/* Okruszki jak na karcie produktu – tytuł dopiero od `sm:`,
              na telefonie łamałby się na drugi wiersz */}
          <nav aria-label="Okruszki">
            <ol className="flex items-center gap-2 text-xs tracking-widest uppercase text-clay">
              <li>
                <Link href="/moje-projekty" className="hover:text-espresso transition-colors">
                  Moje projekty
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
            <p className="text-xs tracking-[0.25em] uppercase text-clay mb-3">Portfolio</p>
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
                href="/zamowienie-indywidualne"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors group"
              >
                Zamów indywidualnie
                <ArrowRight
                  size={15}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <p className="text-xs text-charcoal/80 mt-3">
                Podobną pracę wykonam na zamówienie – kształt, kolor i wielkość ustalamy wspólnie.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
