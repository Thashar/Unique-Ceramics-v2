// Treść zmienia się rzadko — ISR; zapis ustawień w adminie odświeża cache
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
import { getSettings } from "@/lib/settings";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { hexToRgba } from "@/lib/overlay";

export const metadata: Metadata = {
  title: "Warsztaty ceramiczne",
  description:
    "Warsztaty ceramiczne w małych grupach w okolicach Gliwic — dla początkujących i zaawansowanych. Lepienie z gliny, toczenie, szkliwienie.",
  alternates: { canonical: "https://uniqueceramics.pl/warsztaty" },
  openGraph: {
    title: "Warsztaty ceramiczne — Unique Ceramics",
    description:
      "Warsztaty ceramiczne w małych grupach w okolicach Gliwic. Lepienie z gliny, toczenie na kole, szkliwienie — dla każdego poziomu.",
    url: "https://uniqueceramics.pl/warsztaty",
    images: [
      {
        url: "/images/OpenGraph.webp",
        width: 1200,
        height: 630,
        alt: "Warsztaty ceramiczne — Unique Ceramics Gliwice",
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

export default async function WorkshopsPage() {
  const s = await getSettings([
    "workshops_hero_image", "workshops_hero_position",
    "workshops_hero_overlay_color", "workshops_hero_overlay_opacity",
    "workshops_hero_height",
    "workshops_content_image", "workshops_content_position",
    "workshops_intro", "contact_phone",
    "workshops_offers", "workshops_includes", "workshops_faq",
  ]);
  const heroImage = s.workshops_hero_image;
  const heroPos = s.workshops_hero_position || "50% 50%";
  const heroHeight = parseInt(s.workshops_hero_height) || 50;
  const overlayBg = hexToRgba(s.workshops_hero_overlay_color, s.workshops_hero_overlay_opacity);
  const contentImage = s.workshops_content_image;
  const contentPos = s.workshops_content_position || "50% 50%";
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
        name: "Unique Ceramics — pracownia",
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
      <main className="flex-1 pt-[100px]">
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

        {/* Lead */}
        <div className="bg-warm-white py-16 px-6 lg:px-10">
          {contentImage ? (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div
                className="text-charcoal/80 text-lg leading-relaxed [&_p]:mb-4 [&_strong]:text-espresso"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(intro) }}
              />
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm">
                <Image
                  src={contentImage}
                  alt="Warsztaty ceramiczne"
                  fill
                  className="object-cover"
                  style={{ objectPosition: contentPos }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          ) : (
            <div
              className="max-w-3xl mx-auto text-center text-charcoal/80 text-lg leading-relaxed [&_p]:mb-4 [&_strong]:text-espresso"
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(intro) }}
            />
          )}
        </div>

        {/* Separator między wprowadzeniem a pierwszą ofertą — taka sama kreska jak między warsztatami */}
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
                      <p className="text-charcoal/75 leading-relaxed mb-6">{w.description}</p>
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
                      <Link href="/kontakt" className="block text-center bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase py-4 transition-colors">
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
                      <p className="text-sm text-charcoal/75 leading-relaxed">{inc.label}</p>
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
                    <p className="text-charcoal/70 leading-relaxed text-sm">{item.answer}</p>
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
