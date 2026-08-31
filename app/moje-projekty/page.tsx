import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import ProjectCard from "./ProjectCard";
import { getProjects } from "@/lib/portfolio";
import { projectSlugs } from "@/lib/portfolio-slug";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Moje projekty",
  description:
    "Prace ceramiczne wykonywane w pracowni Unique Ceramics – każdy projekt to unikalne dzieło stworzone ręcznie z lokalnej gliny.",
  path: "/moje-projekty",
});

export default async function ProjectsPage() {
  const projects = await getProjects();
  // Adresy liczymy z całej listy – patrz `lib/portfolio-slug.ts`
  const slugs = projectSlugs(projects);

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Moje projekty", path: "/moje-projekty" }]} />
      <Header />
      <main className="flex-1">
        {/* Nagłówek */}
        <div className="bg-cream px-6 lg:px-10 py-10">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Portfolio</p>
            <h1 className="font-serif text-5xl md:text-6xl text-espresso">Moje projekty</h1>
          </div>
        </div>

        {/* Siatka projektów – ten sam układ co katalog sklepu: zdjęcie i tytuł,
            reszta (wszystkie zdjęcia, opis) dopiero po wejściu w projekt */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <ClayRule className="mb-10" />
          {projects.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-serif text-2xl text-espresso mb-2">Brak projektów</p>
              <p className="text-charcoal/80 text-sm">Projekty pojawią się wkrótce.</p>
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
      <Footer />
    </>
  );
}
