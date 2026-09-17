import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import AboutTeaser from "@/components/home/AboutTeaser";
import WorkshopsTeaser from "@/components/home/WorkshopsTeaser";
import HomeScrollSnap from "@/components/home/HomeScrollSnap";
import Header from "@/components/layout/HeaderWrapper";
import FooterWithInstagram from "@/components/layout/FooterWithInstagram";
import { getSettings } from "@/lib/settings";
import {
  HOME_ABOUT_DEFAULT,
  HOME_ABOUT_DEFAULT_EN,
  HOME_ABOUT_KEYS,
  HOME_HERO_DEFAULT,
  HOME_HERO_DEFAULT_EN,
  HOME_HERO_KEYS,
  HOME_TEXT_SETTING_KEYS,
  HOME_WORKSHOPS_DEFAULT,
  HOME_WORKSHOPS_DEFAULT_EN,
  HOME_WORKSHOPS_KEYS,
} from "@/lib/home-sections";
import { OG_PAGE_IMAGE, SITE_URL, absoluteUrl, languageAlternates, ogImage } from "@/lib/seo";
import { jsonLdHtml } from "@/lib/escape-html";
import { OG_LOCALE, SCHEMA_LANG, localePath, type Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";
import { englishContentFor } from "@/lib/content-translations";
import { localizedSetting } from "@/lib/i18n-content";

// Tytuł strony głównej to marka + imię i nazwisko właścicielki (decyzja
// właściciela 16.09.2026): tak ma wyglądać wynik w Google, a nazwisko ma
// pozycjonować stronę. `absolute` omija szablon `%s | Unique Ceramics`
// z layoutu – inaczej marka stałaby w tytule dwa razy.
const HOME_TITLE = "Unique Ceramics - Alicja Ulbrich";

/**
 * Metadane strony głównej w danym języku. Opis wyniku w Google (treść od
 * właściciela, 17.09.2026) siedzi w słowniku (`meta.homeDescription`) – ten sam
 * tekst idzie do Open Graph i do schematu `WebPage`, żeby sygnały się nie
 * rozjeżdżały. Google i tak sam wybiera fragment do wyniku – gdy uzna treść
 * strony za trafniejszą, pokaże ją zamiast tego opisu.
 */
export function homeMetadata(locale: Locale): Metadata {
  const description = t(locale).meta.homeDescription;
  const url = `${SITE_URL}${localePath(locale, "/")}`;
  return {
    title: { absolute: HOME_TITLE },
    description,
    alternates: { canonical: url, languages: languageAlternates("/") },
    openGraph: {
      title: HOME_TITLE,
      description,
      url,
      locale: OG_LOCALE[locale],
      // Zdjęcie hero (z panelu) jako JPEG 1200×630 z kadrem z panelu – nie logo
      // i nie WebP, którego WhatsApp nie renderuje
      images: [ogImage(OG_PAGE_IMAGE.home, HOME_TITLE)],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description,
      images: [OG_PAGE_IMAGE.home],
    },
  };
}

/**
 * Strona główna – wspólna dla `/` i `/en`. Teksty sekcji idą z ustawień;
 * po angielsku z kluczy `en_home_*`, a bez nich z angielskich domyślnych
 * (gdy polski tekst też jest domyślny) albo z polskiego oryginału.
 */
export default async function HomePage({ locale = "pl" }: { locale?: Locale }) {
  const d = t(locale);
  const s = await getSettings([
    "contact_instagram",
    "home_hero_image", "home_hero_position",
    ...HOME_TEXT_SETTING_KEYS,
    "home_about_image", "home_about_position",
    "home_workshops_image", "home_workshops_position",
  ]);
  const en = await englishContentFor(locale);
  // Tekst sekcji w języku strony – patrz `localizedSetting`
  const text = (key: string, plDefault: string, enDefault: string) =>
    localizedSetting(locale, key, s, en, { pl: plDefault, en: enDefault });

  // Zdjęcie hero jako **główny obraz strony**. Wyszukiwarce nie da się
  // nakazać, które zdjęcie pokaże przy wyniku, ale `primaryImageOfPage`
  // (razem z `image` firmy w LocalBusiness i sitemapą obrazków) jest
  // najmocniejszym sygnałem, jaki możemy wysłać
  const pageUrl = `${SITE_URL}${localePath(locale, "/")}`;
  const pageSchema = s.home_hero_image
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: HOME_TITLE,
        description: d.meta.homeDescription,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#business` },
        inLanguage: SCHEMA_LANG[locale],
        primaryImageOfPage: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#primaryimage`,
          url: absoluteUrl(s.home_hero_image),
          contentUrl: absoluteUrl(s.home_hero_image),
          caption: d.home.heroAlt,
        },
      }
    : null;

  return (
    <>
      {pageSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageSchema) }}
        />
      )}
      <HomeScrollSnap />
      <Header hideVacation locale={locale} />
      <main className="flex-1">
        <Hero
          locale={locale}
          heroImage={s.home_hero_image}
          heroPosition={s.home_hero_position}
          eyebrow={text(HOME_HERO_KEYS.eyebrow, HOME_HERO_DEFAULT.eyebrow, HOME_HERO_DEFAULT_EN.eyebrow)}
          title={text(HOME_HERO_KEYS.title, HOME_HERO_DEFAULT.title, HOME_HERO_DEFAULT_EN.title)}
          text={text(HOME_HERO_KEYS.text, HOME_HERO_DEFAULT.text, HOME_HERO_DEFAULT_EN.text)}
          ctaPrimary={text(HOME_HERO_KEYS.ctaPrimary, HOME_HERO_DEFAULT.ctaPrimary, HOME_HERO_DEFAULT_EN.ctaPrimary)}
          ctaSecondary={text(HOME_HERO_KEYS.ctaSecondary, HOME_HERO_DEFAULT.ctaSecondary, HOME_HERO_DEFAULT_EN.ctaSecondary)}
          scrollLabel={text(HOME_HERO_KEYS.scroll, HOME_HERO_DEFAULT.scroll, HOME_HERO_DEFAULT_EN.scroll)}
        />
        <FeaturedProducts locale={locale} />
        <AboutTeaser
          aboutImage={s.home_about_image}
          aboutPosition={s.home_about_position}
          eyebrow={text(HOME_ABOUT_KEYS.eyebrow, HOME_ABOUT_DEFAULT.eyebrow, HOME_ABOUT_DEFAULT_EN.eyebrow)}
          title={text(HOME_ABOUT_KEYS.title, HOME_ABOUT_DEFAULT.title, HOME_ABOUT_DEFAULT_EN.title)}
          text={text(HOME_ABOUT_KEYS.text, HOME_ABOUT_DEFAULT.text, HOME_ABOUT_DEFAULT_EN.text)}
          cta={text(HOME_ABOUT_KEYS.cta, HOME_ABOUT_DEFAULT.cta, HOME_ABOUT_DEFAULT_EN.cta)}
        />
        <WorkshopsTeaser
          workshopsImage={s.home_workshops_image}
          workshopsPosition={s.home_workshops_position}
          eyebrow={text(HOME_WORKSHOPS_KEYS.eyebrow, HOME_WORKSHOPS_DEFAULT.eyebrow, HOME_WORKSHOPS_DEFAULT_EN.eyebrow)}
          title={text(HOME_WORKSHOPS_KEYS.title, HOME_WORKSHOPS_DEFAULT.title, HOME_WORKSHOPS_DEFAULT_EN.title)}
          text={text(HOME_WORKSHOPS_KEYS.text, HOME_WORKSHOPS_DEFAULT.text, HOME_WORKSHOPS_DEFAULT_EN.text)}
          cta={text(HOME_WORKSHOPS_KEYS.cta, HOME_WORKSHOPS_DEFAULT.cta, HOME_WORKSHOPS_DEFAULT_EN.cta)}
        />
        {/* Treść SEO o obszarze obsługi – dostępna dla wyszukiwarek i czytników ekranu,
            niewidoczna wizualnie (sr-only). Uzupełnia areaServed w JSON-LD (app/layout.tsx).
            Świadomie NIE używamy display:none (Google traktuje to jako ukrywanie treści). */}
        <section aria-label={d.home.areaTitle} className="sr-only">
          <h2>{d.home.areaTitle}</h2>
          <p>{d.home.areaText}</p>
        </section>
        {/* Stopka z Instagramem – pt-20 kompensuje header, min-h-svh wypełnia viewport.
            Tło espresso jak w sekcjach hero, więc header zostaje przezroczysty
            (ciemny jest tylko nad jasną sekcją „Wybrane prace"). */}
        <div
          data-snap
          data-snap-free
          data-header-fade
          data-header-theme="transparent"
          className="bg-espresso min-h-svh lg:h-svh flex flex-col"
        >
          <FooterWithInstagram instagram={s.contact_instagram} locale={locale} />
        </div>
      </main>
    </>
  );
}
