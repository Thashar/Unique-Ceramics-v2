// Treść zmienia się rzadko – ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  type LucideIcon,
  Cake, Gem, Building2, Leaf, Users, Gift,
  Package, GraduationCap, Flame, Camera, Coffee, CheckCircle,
  Star, Heart, Palette, Globe, Music, Award, Scissors,
} from "lucide-react";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import ImageGallery from "@/components/ui/ImageGallery";
import { getSettings } from "@/lib/settings";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { hexToRgba } from "@/lib/overlay";
import { parseGallery } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Warsztaty ceramiczne",
  description:
    "Warsztaty ceramiczne w małych grupach w okolicach Gliwic – dla początkujących i zaawansowanych. Lepienie z gliny, toczenie, szkliwienie.",
  alternates: { canonical: "https://uniqueceramics.pl/warsztaty" },
  openGraph: {
    title: "Warsztaty ceramiczne – Unique Ceramics",
    description:
      "Warsztaty ceramiczne w małych grupach w okolicach Gliwic. Lepienie z gliny, toczenie na kole, szkliwienie – dla każdego poziomu.",
    url: "https://uniqueceramics.pl/warsztaty",
    images: [
      {
        url: "/images/OpenGraph.webp",
        width: 1200,
        height: 630,
        alt: "Warsztaty ceramiczne – Unique Ceramics Gliwice",
      },
    ],
  },
};

// Mapa ikon (nazwa → komponent)
const ICON_MAP: Record<string, LucideIcon> = {
  Cake, Gem, Building2, Leaf, Users, Gift,
  Package, GraduationCap, Flame, Camera, Coffee, CheckCircle,
  Star, Heart, Palette, Globe, Music, Award, Scissors,
};

type WorkshopOffer = {
  id: number;
  iconName: string;
  title: string;
  description: string;
  duration: string;
  maxPeople: string;
  priceLabel: string;
  level: string;
  active: boolean;
};

type WorkshopInclude = {
  id: number;
  iconName: string;
  label: string;
};

type WorkshopFaq = {
  id: number;
  question: string;
  answer: string;
};

function parseJson<T>(json: string): T[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

// Wprowadzenie: tekst do lewej, pierwszy akapit jako lead (Playfair, większy,
// ciemniejszy). `p:first-child` zamiast klasy w treści — HTML z panelu zostaje
// nietknięty, a nowy akapit dopisany na początku automatycznie staje się leadem.
const INTRO_PROSE = [
  "text-charcoal/80 text-lg leading-relaxed [&_p]:mb-4 [&_strong]:text-espresso",
  // Krok wielkości celowo mały — wyróżnienie nosi serif i kolor. Przy dłuższym
  // pierwszym akapicie duży stopień pisma zamieniał lead w ścianę tekstu.
  "[&>p:first-child]:font-serif [&>p:first-child]:text-xl [&>p:first-child]:md:text-[22px]",
  "[&>p:first-child]:leading-relaxed [&>p:first-child]:text-espresso [&>p:first-child]:mb-5",
].join(" ");

export default async function WorkshopsPage() {
  const s = await getSettings([
    "workshops_hero_image", "workshops_hero_position",
    "workshops_hero_overlay_color", "workshops_hero_overlay_opacity",
    "workshops_hero_height",
    "workshops_content_gallery", "workshops_content_image", "workshops_content_position",
    "workshops_intro", "contact_phone",
    "workshops_offers", "workshops_includes", "workshops_faq",
  ]);
  const heroImage = s.workshops_hero_image;
  const heroPos = s.workshops_hero_position || "50% 50%";
  // Minimum 30vh – pilnuje też wartości zapisanych zanim suwak dostał ten próg
  const heroHeight = Math.max(30, parseInt(s.workshops_hero_height) || 50);
  const overlayBg = hexToRgba(s.workshops_hero_overlay_color, s.workshops_hero_overlay_opacity);
  // Galeria przy wprowadzeniu; stary klucz `workshops_content_image` = pojedyncze zdjęcie
  const gallery = parseGallery(s.workshops_content_gallery, s.workshops_content_image, s.workshops_content_position);
  const hasGallery = gallery.length > 0;
  const intro = s.workshops_intro;

  const workshops = parseJson<WorkshopOffer>(s.workshops_offers).filter((w) => w.active);
  const includes = parseJson<WorkshopInclude>(s.workshops_includes);
  const faq = parseJson<WorkshopFaq>(s.workshops_faq);

  const BASE = "https://uniqueceramics.pl";
  const courseSchemas = workshops.map((w) => ({
    "@context": "https://schema.org",
    "@type": "Course",
    name: w.title,
    description: w.description,
    provider: {
      "@type": "Organization",
      name: "Unique Ceramics",
      url: BASE,
    },
    url: `${BASE}/warsztaty`,
    inLanguage: "pl-PL",
    offers: {
      "@type": "Offer",
      price: w.priceLabel,
      priceCurrency: "PLN",
    },
    courseMode: "in-person",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "in-person",
      location: {
        "@type": "Place",
        name: "Unique Ceramics – pracownia",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Familijna 23",
          postalCode: "44-164",
          addressLocality: "Kleszczów",
          addressCountry: "PL",
        },
      },
    },
  }));

  return (
    <>
      {courseSchemas.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchemas) }}
        />
      )}
      <Header />
      <main className="flex-1">
        {/* Hero */}
        {heroImage ? (
          <div className="relative overflow-hidden" style={{ height: `${heroHeight}vh` }}>
            <Image src={heroImage} alt="Warsztaty ceramiczne" fill priority className="object-cover" style={{ objectPosition: heroPos }} sizes="100vw" />
            <div className="absolute inset-0" style={{ backgroundColor: overlayBg }} />
            <div className="absolute inset-0 flex items-end">
              <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full pb-16">
                <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-3">Nauka</p>
                <h1 className="font-serif text-5xl md:text-6xl text-cream">Warsztaty ceramiczne</h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-cream px-6 lg:px-10 py-10">
            <div className="max-w-7xl mx-auto">
              <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Nauka</p>
              <h1 className="font-serif text-5xl md:text-6xl text-espresso">Warsztaty ceramiczne</h1>
            </div>
          </div>
        )}

        {/* Lead — ozdobnik (kreska z mozaiką) + wprowadzenie.
            Pierwszy akapit jest wyróżniony selektorem `p:first-child`, więc treść
            w panelu pozostaje zwykłym HTML-em — nie trzeba nic oznaczać ręcznie. */}
        <div className="bg-warm-white py-16 px-6 lg:px-10">
          {hasGallery ? (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <ClayRule className="mb-7" />
                <div className={INTRO_PROSE} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(intro) }} />
              </div>
              <ImageGallery
                images={gallery}
                alt="Zdjęcia z warsztatów ceramicznych"
                className="aspect-[3/4] rounded-sm"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          ) : (
            <div className="max-w-[62ch] mx-auto">
              <ClayRule className="mb-7" />
              <div className={INTRO_PROSE} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(intro) }} />
            </div>
          )}
        </div>

        {/* Separator między wprowadzeniem a pierwszą ofertą – taka sama kreska jak między warsztatami */}
        {workshops.length > 0 && (
          <div className="bg-warm-white px-6 lg:px-10">
            <div className="max-w-7xl mx-auto border-t border-sand" />
          </div>
        )}

        {/* Lista warsztatów */}
        {workshops.length > 0 && (
          <div className="bg-warm-white py-20 px-6 lg:px-10">
            <div className="max-w-7xl mx-auto space-y-12">
              {workshops.map((w) => {
                const Icon = ICON_MAP[w.iconName] ?? Leaf;
                return (
                  <div key={w.id} className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-b border-sand pb-12 last:border-0 last:pb-0">
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-cream rounded-full flex items-center justify-center shrink-0">
                          <Icon size={18} strokeWidth={1.5} className="text-clay" />
                        </div>
                        <span className="text-xs tracking-widest uppercase text-clay">{w.level}</span>
                      </div>
                      <h2 className="font-serif text-3xl text-espresso mb-4">{w.title}</h2>
                      <p className="text-charcoal/80 leading-relaxed mb-6">{w.description}</p>
                    </div>
                    <div className="bg-cream p-8 self-start">
                      <div className="space-y-3 mb-8">
                        {w.duration && (
                          <div className="flex justify-between text-sm">
                            <span className="text-charcoal/80">Czas trwania</span>
                            <span className="text-espresso font-medium">{w.duration}</span>
                          </div>
                        )}
                        {w.maxPeople && (
                          <div className="flex justify-between text-sm">
                            <span className="text-charcoal/80">Liczba uczestników</span>
                            <span className="text-espresso font-medium">{w.maxPeople}</span>
                          </div>
                        )}
                        {w.priceLabel && (
                          <div className="flex justify-between text-sm border-t border-sand pt-3">
                            <span className="text-charcoal/80">Cena</span>
                            <span className="font-serif text-xl text-espresso">{w.priceLabel}</span>
                          </div>
                        )}
                      </div>
                      <Link href="/kontakt" className="block text-center bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase py-4 transition-colors">
                        Zarezerwuj
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Co zawiera warsztat */}
        {includes.length > 0 && (
          <div className="bg-cream py-20 px-6 lg:px-10">
            <div className="max-w-7xl mx-auto">
              <h2 className="font-serif text-3xl text-espresso mb-12 text-center">Co zawiera warsztat?</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {includes.map((inc) => {
                  const Icon = ICON_MAP[inc.iconName] ?? CheckCircle;
                  return (
                    <div key={inc.id} className="bg-warm-white p-6 text-center">
                      <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center mx-auto mb-3">
                        <Icon size={18} strokeWidth={1.5} className="text-clay" />
                      </div>
                      <p className="text-sm text-charcoal/80 leading-relaxed">{inc.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <div className="bg-mist py-20 px-6 lg:px-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-serif text-3xl text-espresso mb-12 text-center">Często zadawane pytania</h2>
              <div className="space-y-8">
                {faq.map((item) => (
                  <div key={item.id} className="border-b border-sand pb-8 last:border-0 last:pb-0">
                    <h3 className="font-serif text-xl text-espresso mb-3">{item.question}</h3>
                    <p className="text-charcoal/80 leading-relaxed text-sm">{item.answer}</p>
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
