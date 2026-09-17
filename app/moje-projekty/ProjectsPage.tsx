import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import ProjectCard from "./ProjectCard";
import { getProjects } from "@/lib/portfolio";
import { projectSlugs } from "@/lib/portfolio-slug";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";
import { englishContentFor } from "@/lib/content-translations";
import { localizeProject } from "@/lib/i18n-content";

export function projectsMetadata(locale: Locale): Metadata {
  const m = t(locale).meta;
  return pageMetadata({
    title: m.projectsTitle,
    description: m.projectsDescription,
    path: "/moje-projekty",
    locale,
  });
}

/** Portfolio – wspólne dla `/moje-projekty` i `/en/moje-projekty`; tytuły po angielsku z `en_project_{id}`. */
export default async function ProjectsPage({ locale = "pl" }: { locale?: Locale }) {
  const d = t(locale);
  const en = await englishContentFor(locale);
  const original = await getProjects();
  // Adresy liczymy z całej listy **przed** tłumaczeniem – slug projektu bierze
  // się z polskiego tytułu i jest ten sam w obu językach (tak szuka go strona
  // projektu). Liczony z angielskiego tytułu dawał 404 na `/en` (17.09.2026)
  const slugs = projectSlugs(original);
  const projects = original.map((p) => localizeProject(locale, p, en));

  return (
    <>
      <BreadcrumbSchema locale={locale} items={[{ name: d.nav.projects, path: "/moje-projekty" }]} />
      <Header locale={locale} />
      <main className="flex-1">
        {/* Nagłówek */}
        <div className="bg-cream px-6 lg:px-10 py-10">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">{d.projects.eyebrow}</p>
            <h1 className="font-serif text-5xl md:text-6xl text-espresso">{d.projects.title}</h1>
          </div>
        </div>

        {/* Siatka projektów – ten sam układ co katalog sklepu: zdjęcie i tytuł,
            reszta (wszystkie zdjęcia, opis) dopiero po wejściu w projekt */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <ClayRule className="mb-10" />
          {projects.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-serif text-2xl text-espresso mb-2">{d.projects.none}</p>
              <p className="text-charcoal/80 text-sm">{d.projects.soon}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  slug={slugs.get(project.id) ?? project.id}
                  image={project.images[0]}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
