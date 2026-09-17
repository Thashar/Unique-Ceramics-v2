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
import { OG_PAGE_IMAGE, ogImage, pageMetadata, SITE_URL } from "@/lib/seo";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { jsonLdHtml } from "@/lib/escape-html";
import { localePath, type Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";
import { englishContentFor } from "@/lib/content-translations";
import { localizedSetting } from "@/lib/i18n-content";
import {
  ABOUT_VALUES_DEFAULT_EN_JSON,
  ABOUT_VALUES_DEFAULT_JSON,
  ABOUT_VALUES_TITLE_DEFAULT,
  ABOUT_VALUES_TITLE_DEFAULT_EN,
} from "@/lib/about-values";

/** Właścicielka pracowni – nazwisko jest w tytule strony i w danych strukturalnych. */
const OWNER_NAME = "Alicja Ulbrich";

export function aboutMetadata(locale: Locale): Metadata {
  const m = t(locale).meta;
  return pageMetadata({
    title: m.aboutTitle,
    description: m.aboutDescription,
    path: "/o-mnie",
    // Podgląd linku = zdjęcie hero tej strony (z panelu), nie domyślna grafika
    image: ogImage(OG_PAGE_IMAGE.about, `${OWNER_NAME} – Unique Ceramics`),
    locale,
  });
}

// Dane strukturalne osoby – wiążą nazwisko z marką (wyszukiwarka pokazuje
// wtedy pracownię przy zapytaniu o imię i nazwisko, i odwrotnie).
// `@id` jest zawsze polski – to jedna osoba, a `LocalBusinessSchema` wskazuje
// właśnie ten identyfikator
function personSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/o-mnie#person`,
    name: OWNER_NAME,
    jobTitle: t(locale).about.jobTitle,
    url: `${SITE_URL}${localePath(locale, "/o-mnie")}`,
    worksFor: { "@id": `${SITE_URL}/#business` },
    knowsAbout: locale === "en"
      ? ["artistic ceramics", "functional ceramics", "pottery workshops"]
      : ["ceramika artystyczna", "ceramika użytkowa", "warsztaty ceramiczne"],
  };
}

/**
 * Strona „O mnie” – wspólna dla `/o-mnie` i `/en/o-mnie`. Historia i karty
 * „Jak pracuję” po angielsku idą z kluczy `en_about_story`, `en_about_values_title`
 * i `en_about_values` (panel → O mnie → EN); bez nich zostaje polski tekst.
 */
export default async function AboutPage({ locale = "pl" }: { locale?: Locale }) {
  const d = t(locale);
  const s = await getSettings([
    "about_hero_image", "about_hero_position",
    "about_hero_eyebrow", "about_hero_title",
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
  const en = await englishContentFor(locale);
  const story = localizedSetting(locale, "about_story", s, en);
  // Teksty nagłówka z panelu (O mnie → „Teksty nagłówka”); nietknięte domyślne
  // po angielsku dostają angielski tekst ze słownika. Pusty napis nad nagłówkiem
  // znika, pusty nagłówek wraca do domyślnego – strona musi mieć h1
  const heroEyebrow = localizedSetting(locale, "about_hero_eyebrow", s, en, {
    pl: t("pl").about.eyebrow,
    en: t("en").about.eyebrow,
  }).trim();
  const heroTitle = localizedSetting(locale, "about_hero_title", s, en, {
    pl: t("pl").about.title,
    en: t("en").about.title,
  }).trim() || d.about.title;
  // Sekcja „Jak pracuję” – treść z panelu; pusta lista ukrywa całą sekcję.
  // Po angielsku: klucze `en_about_values*` z panelu, a przy nietkniętych
  // domyślnych – angielskie domyślne z kodu
  const values = parseAboutValues(
    localizedSetting(locale, "about_values", s, en, { pl: ABOUT_VALUES_DEFAULT_JSON, en: ABOUT_VALUES_DEFAULT_EN_JSON })
  );
  const valuesTitle = localizedSetting(locale, "about_values_title", s, en, {
    pl: ABOUT_VALUES_TITLE_DEFAULT,
    en: ABOUT_VALUES_TITLE_DEFAULT_EN,
  }).trim();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(personSchema(locale)) }}
      />
      <BreadcrumbSchema locale={locale} items={[{ name: d.nav.about, path: "/o-mnie" }]} />
      <Header locale={locale} />
      <main className="flex-1">
        {/* Hero */}
        {heroImage ? (
          <div className="relative overflow-hidden" style={{ height: `${heroHeight}vh` }}>
            <Image
              src={heroImage}
              alt={d.about.heroAlt}
              fill
              priority
              className="object-cover"
              style={{ objectPosition: heroPos }}
              sizes="100vw"
            />
            <div className="absolute inset-0" style={{ backgroundColor: overlayBg }} />
            <div className="absolute inset-0 flex items-end">
              <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full pb-16">
                {heroEyebrow && <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-3">{heroEyebrow}</p>}
                <h1 className="font-serif text-5xl md:text-6xl text-cream">{heroTitle}</h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-cream px-6 lg:px-10 py-10">
            <div className="max-w-7xl mx-auto">
              {heroEyebrow && <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">{heroEyebrow}</p>}
              <h1 className="font-serif text-5xl md:text-6xl text-espresso">{heroTitle}</h1>
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
                  href={localePath(locale, "/moje-projekty")}
                  className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors group rounded-md"
                >
                  {d.about.myWorks}
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </Link>
                <Link
                  href={localePath(locale, "/sklep")}
                  className="inline-flex items-center gap-2 border border-espresso hover:bg-espresso hover:text-cream text-espresso text-sm tracking-widest uppercase px-8 py-4 transition-colors rounded-md"
                >
                  {d.about.shopRange}
                </Link>
              </div>
            </div>

            {/* Sidebar z galerią – widoczny tylko gdy dodano zdjęcia */}
            {hasGallery && (
              <div className="lg:col-span-5">
                <ImageGallery
                  images={gallery}
                  alt={d.about.galleryAlt}
                  className="aspect-[4/3] rounded-xl w-full max-w-xl mx-auto"
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
      <Footer locale={locale} />
    </>
  );
}
