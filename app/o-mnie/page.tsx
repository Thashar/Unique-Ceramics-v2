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

export const metadata: Metadata = {
  title: "O mnie",
  description:
    "Poznaj historię Unique Ceramics – pracowni ceramicznej z okolic Gliwic. Ręcznie robiona ceramika tworzona z pasji do gliny na Śląsku.",
  alternates: { canonical: "https://uniqueceramics.pl/o-mnie" },
  openGraph: {
    title: "O mnie – Unique Ceramics",
    description:
      "Poznaj historię pracowni ceramicznej Unique Ceramics z okolic Gliwic. Ręcznie robiona ceramika tworzona z pasji do gliny.",
    url: "https://uniqueceramics.pl/o-mnie",
    images: [
      {
        url: "/images/OpenGraph.webp",
        width: 1200,
        height: 630,
        alt: "Pracownia ceramiczna Unique Ceramics – Gliwice",
      },
    ],
  },
};

export default async function AboutPage() {
  const s = await getSettings([
    "about_hero_image", "about_hero_position",
    "about_hero_overlay_color", "about_hero_overlay_opacity",
    "about_hero_height",
    "about_content_gallery", "about_content_image", "about_content_position",
    "about_story",
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

  return (
    <>
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
                className="space-y-5 text-charcoal/80 leading-relaxed [&_p]:mb-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-espresso [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_strong]:text-espresso"
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

        {/* Wartości */}
        <div className="bg-cream py-20 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-[2rem] md:text-4xl text-espresso mb-5 text-center">Jak pracuję</h2>
            <ClayRule align="center" className="max-w-[220px] mx-auto mb-12" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { title: "Ręcznie", text: "Każdy przedmiot tworzę osobiście. Nie korzystam z produkcji seryjnej ani odlewów." },
                { title: "Z uwagą", text: "Dbam o każdy detal – od kształtu, przez glazurę, aż po opakowanie." },
                { title: "Z pasją", text: "Ceramika to nie tylko zawód – to sposób, w jaki postrzegam i tworzę piękno." },
              ].map(({ title, text }) => (
                <div key={title} className="text-center">
                  <h3 className="font-serif text-2xl text-espresso mb-4">{title}</h3>
                  <p className="text-charcoal/80 leading-relaxed text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
