import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import { getProjects } from "@/lib/portfolio";
import Image from "next/image";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export const revalidate = 300;

export const metadata = {
  title: "Moje projekty",
  description:
    "Prace ceramiczne wykonywane w pracowni Unique Ceramics — każdy projekt to unikalne dzieło stworzone ręcznie z lokalnej gliny.",
  alternates: { canonical: "https://uniqueceramics.pl/moje-projekty" },
  openGraph: {
    title: "Moje projekty — Unique Ceramics",
    description:
      "Prace ceramiczne tworzone ręcznie z lokalnej gliny. Poznaj moje projekty.",
    url: "https://uniqueceramics.pl/moje-projekty",
  },
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Nagłówek */}
        <div className="bg-cream px-6 lg:px-10 py-10">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Portfolio</p>
            <h1 className="font-serif text-5xl md:text-6xl text-espresso">Moje projekty</h1>
          </div>
        </div>

        {/* Lista projektów */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          {projects.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-serif text-2xl text-espresso mb-2">Brak projektów</p>
              <p className="text-charcoal/50 text-sm">Projekty pojawią się wkrótce.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
              {projects.map((project) => (
                <article key={project.id} className="space-y-5">
                  {project.images[0] && (
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-mist">
                      <Image
                        src={project.images[0]}
                        alt={project.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="space-y-3">
                    <h2 className="font-serif text-2xl text-espresso">{project.title}</h2>
                    {project.description && (
                      <div
                        className="text-charcoal/70 text-sm leading-relaxed [&_p]:mb-3 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-espresso [&_h2]:mb-2 [&_h3]:font-medium [&_h3]:text-espresso [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(project.description) }}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
