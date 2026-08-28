// Treść zmienia się rzadko – ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ICON_MAP, CheckCircle, Leaf } from "./icons";
import WorkshopIncludes from "./WorkshopIncludes";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import ClayRule from "@/components/ui/ClayRule";
import ImageGallery from "@/components/ui/ImageGallery";
import { getSettings } from "@/lib/settings";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { hexToRgba } from "@/lib/overlay";
import { parseGallery } from "@/lib/gallery";
import { pageMetadata } from "@/lib/seo";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = pageMetadata({
  title: "Warsztaty ceramiczne",
  description:
    "Warsztaty ceramiczne w małych grupach w okolicach Gliwic – dla początkujących i zaawansowanych. Lepienie z gliny, toczenie, szkliwienie.",
  path: "/warsztaty",
});

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

/**
 * Kwota z etykiety ceny („od 80 zł / os." → 80). Etykieta jest dowolnym tekstem
 * z panelu, a schema.org wymaga liczby – wpisanie tam całego napisu dawało
 * niepoprawne dane strukturalne. Bez liczby (np. „wycena indywidualna")
 * ofertę pomijamy, zamiast zgadywać.
 */
function priceFrom(label: string): number | null {
  const match = label.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseJson<T>(json: string): T[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

// Wprowadzenie: tekst do lewej w węższej kolumnie, bez wyróżniania pierwszego
// akapitu — całość jednolita, hierarchię otwarcia niesie sam ozdobnik.
const INTRO_PROSE =
  "text-charcoal/80 text-lg leading-relaxed [&_p]:mb-4 [&_strong]:text-espresso";

export default async function WorkshopsPage() {
  const s = await getSettings([
    "workshops_hero_image", "workshops_hero_position",
    "workshops_hero_overlay_color", "workshops_hero_overlay_opacity",
    "workshops_hero_height",
    "workshops_content_gallery", "workshops_content_image", "workshops_content_position",
    "workshops_intro", "workshops_includes_gallery", "contact_phone",
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
  // Osobna galeria przy liście „Co zawiera warsztat?"
  const includesGallery = parseGallery(s.workshops_includes_gallery);
  const hasIncludesGallery = includesGallery.length > 0;
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
    // Etykieta mówi „od tylu zł”, więc kwotę podajemy jako cenę minimalną,
    // a nie jako cenę dokładną
    ...(priceFrom(w.priceLabel) !== null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "PLN",
            availability: "https://schema.org/InStock",
            url: `${BASE}/warsztaty`,
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "PLN",
              minPrice: priceFrom(w.priceLabel),
            },
          },
        }
      : {}),
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

  // FAQ jest widoczne na stronie, więc może pojechać też jako dane
  // strukturalne – pytania i odpowiedzi biorą się z panelu
  const faqSchema =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;

  return (
    <>
      {courseSchemas.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchemas) }}
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <BreadcrumbSchema items={[{ name: "Warsztaty", path: "/warsztaty" }]} />
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

        {/* Wprowadzenie — ozdobnik (kreska z mozaiką) nad tekstem do lewej.
            Treść w panelu pozostaje zwykłym HTML-em, bez wyróżnień na akapitach. */}
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
                className="aspect-[4/3] rounded-sm w-full max-w-xl mx-auto"
                sizes="(max-width: 640px) 100vw, 576px"
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

        {/* Co zawiera warsztat – lista po lewej, pokaz zdjęć po prawej.
            Bez zdjęć lista zwęża się i zostaje na środku, żeby nie wisiała w pustce. */}
        {includes.length > 0 && (
          <div className="bg-cream py-20 px-6 lg:px-10">
            <div className={`mx-auto ${hasIncludesGallery ? "max-w-6xl" : "max-w-xl"}`}>
              {hasIncludesGallery ? (
                <>
                  {/* Sam ozdobnik nad siatką; nagłówek jest w lewej kolumnie, więc
                      górna krawędź galerii wypada dokładnie na jego wysokości */}
                  <ClayRule className="mb-7" />
                  <WorkshopIncludes includes={includes} images={includesGallery} title="Co zawiera warsztat?" />
                </>
              ) : (
                <>
                  <h2 className="font-serif text-[2rem] md:text-4xl text-espresso mb-5 text-center">Co zawiera warsztat?</h2>
                  <ClayRule align="center" className="max-w-[220px] mx-auto mb-12" />
                  <ul className="space-y-4">
                    {includes.map((inc) => {
                      const Icon = ICON_MAP[inc.iconName] ?? CheckCircle;
                      return (
                        <li key={inc.id} className="flex items-center gap-4">
                          <span className="w-11 h-11 bg-warm-white rounded-full flex items-center justify-center shrink-0">
                            <Icon size={19} strokeWidth={1.5} className="text-clay" />
                          </span>
                          <span className="text-charcoal leading-snug">{inc.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <div className="bg-mist py-20 px-6 lg:px-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-serif text-[2rem] md:text-4xl text-espresso mb-5 text-center">Często zadawane pytania</h2>
              <ClayRule align="center" className="max-w-[220px] mx-auto mb-12" />
              {/* Dwie kolumny od md – sekcja jest o połowę krótsza, a odpowiedzi
                  pozostają widoczne bez rozwijania */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {faq.map((item) => (
                  <div key={item.id} className="border-b border-sand pb-8">
                    <h3 className="font-serif text-xl text-espresso mb-3">{item.question}</h3>
                    <p className="text-charcoal/80 leading-relaxed text-sm">{item.answer}</p>
                  </div>
                ))}
              </div>

              {/* Zamknięcie sekcji – bez tego strona urywała się na ostatnim pytaniu */}
              <div className="mt-12 bg-warm-white border border-sand p-7 flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="font-serif text-xl text-espresso mb-1">Nie ma tu Twojego pytania?</p>
                  <p className="text-sm text-charcoal/80">Napisz albo zadzwoń – chętnie wszystko wyjaśnię.</p>
                </div>
                <Link
                  href="/kontakt"
                  className="bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-8 py-4 transition-colors whitespace-nowrap"
                >
                  Napisz do mnie
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
