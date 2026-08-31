// Treść zmienia się rzadko – ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import ImageGallery from "@/components/ui/ImageGallery";
import { getSettings } from "@/lib/settings";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { hexToRgba } from "@/lib/overlay";
import { parseGallery } from "@/lib/gallery";
import { parseAboutValues } from "@/lib/about-values";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

/** Właścicielka pracowni – nazwisko jest w tytule strony i w danych strukturalnych. */
const OWNER_NAME = "Alicja Ulbrich";

export const metadata: Metadata = pageMetadata({
  title: `O mnie – ${OWNER_NAME}`,
  description:
    `${OWNER_NAME} i pracownia Unique Ceramics z okolic Gliwic. Poznaj historię ręcznie robionej ceramiki tworzonej z pasji do gliny na Śląsku.`,
  path: "/o-mnie",
});

// Dane strukturalne osoby – wiążą nazwisko z marką (wyszukiwarka pokazuje
// wtedy pracownię przy zapytaniu o imię i nazwisko, i odwrotnie)
const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE_URL}/o-mnie#person`,
  name: OWNER_NAME,
  jobTitle: "Ceramiczka",
  url: `${SITE_URL}/o-mnie`,
  worksFor: { "@id": `${SITE_URL}/#business` },
  knowsAbout: ["ceramika artystyczna", "ceramika użytkowa", "warsztaty ceramiczne"],
};

export default async function AboutPage() {
  const s = await getSettings([
    "about_hero_image", "about_hero_position",
    "about_hero_overlay_color", "about_hero_overlay_opacity",
    "about_hero_height",
    "about_content_gallery", "about_content_image", "about_content_position",
    "about_story",
    "about_values_title", "about_values",
  ]);
  const heroImage = s.about_hero_image;
  const heroPos = s.about_hero_position || "50% 50%";
  // Minimum 30vh – pilnuje też wartości zapisanych zanim suwak dostał ten próg
  const heroHeight = Math.max(30, parseInt(s.about_hero_height) || 50);
  const overlayBg = hexToRgba(s.about_hero_overlay_color, s.about_hero_overlay_opacity);
  // Galeria przy opisie; stare klucze `about_content_image` działają jako pojedyncze zdjęcie
  const gallery = parseGallery(s.about_content_gallery, s.about_content_image, s.about_content_position);
  const hasGallery = gallery.length > 0;
  const story = s.about_story;
  // Sekcja „Jak pracuję” – treść z panelu; pusta lista ukrywa całą sekcję
  const values = parseAboutValues(s.about_values);
  const valuesTitle = s.about_values_title?.trim() ?? "";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <BreadcrumbSchema items={[{ name: "O mnie", path: "/o-mnie" }]} />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        {heroImage ? (
          <div className="relative overflow-hidden" style={{ height: `${heroHeight}vh` }}>
            <Image
              src={heroImage}
              alt="Pracownia ceramiczna"
              fill
              priority
              className="object-cover"
              style={{ objectPosition: heroPos }}
              sizes="100vw"
            />
            <div className="absolute inset-0" style={{ backgroundColor: overlayBg }} />
            <div className="absolute inset-0 flex items-end">
              <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full pb-16">
                <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-3">Pracownia</p>
                <h1 className="font-serif text-5xl md:text-6xl text-cream">O mnie</h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-cream px-6 lg:px-10 py-10">
            <div className="max-w-7xl mx-auto">
              <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Pracownia</p>
              <h1 className="font-serif text-5xl md:text-6xl text-espresso">O mnie</h1>
            </div>
          </div>
        )}

        {/* Treść */}
        <div className="bg-warm-white py-24 px-6 lg:px-10">
          <div className={`max-w-7xl mx-auto grid grid-cols-1 gap-16 ${hasGallery ? "lg:grid-cols-12" : ""}`}>
            {/* Tekst główny */}
            <div className={hasGallery ? "lg:col-span-7" : ""}>
              <ClayRule className="mb-7" />
              <div
                className="rich-content"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(story) }}
              />

              <div className="mt-12 flex flex-wrap gap-6">
                <Link
                  href="/moje-projekty"
                  className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors group"
                >
                  Moje prace
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </Link>
                <Link
                  href="/sklep"
                  className="inline-flex items-center gap-2 border border-espresso hover:bg-espresso hover:text-cream text-espresso text-sm tracking-widest uppercase px-8 py-4 transition-colors"
                >
                  Asortyment sklepu
                </Link>
              </div>
            </div>

            {/* Sidebar z galerią – widoczny tylko gdy dodano zdjęcia */}
            {hasGallery && (
              <div className="lg:col-span-5">
                <ImageGallery
                  images={gallery}
                  alt="Zdjęcia z pracowni"
                  className="aspect-[4/3] rounded-sm w-full max-w-xl mx-auto"
                  sizes="(max-width: 640px) 100vw, 576px"
                />
              </div>
            )}
          </div>
        </div>

        {/* Wartości – treść z ustawień (about_values_title, about_values) */}
        {values.length > 0 && (
          <div className="bg-cream py-20 px-6 lg:px-10">
            <div className="max-w-7xl mx-auto">
              {valuesTitle && (
                <h2 className="font-serif text-[2rem] md:text-4xl text-espresso mb-5 text-center">{valuesTitle}</h2>
              )}
              <ClayRule align="center" className="max-w-[220px] mx-auto mb-12" />
              {/* Kolumn tyle, ile kart (maks. 3) – przy dwóch nie zostaje puste pole */}
              <div className={`grid grid-cols-1 gap-10 ${values.length === 1 ? "" : values.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
                {values.map((value) => (
                  <div key={value.id} className="text-center">
                    {value.title && <h3 className="font-serif text-2xl text-espresso mb-4">{value.title}</h3>}
                    {value.text && (
                      <p className="text-charcoal/80 leading-relaxed text-sm whitespace-pre-line">{value.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
