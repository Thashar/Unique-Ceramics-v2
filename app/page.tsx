import type { Metadata } from "next";

export const revalidate = 3600;

// Tytuł strony głównej to marka + imię i nazwisko właścicielki (decyzja
// właściciela 16.09.2026): tak ma wyglądać wynik w Google, a nazwisko ma
// pozycjonować stronę. `absolute` omija szablon `%s | Unique Ceramics`
// z layoutu – inaczej marka stałaby w tytule dwa razy.
const HOME_TITLE = "Unique Ceramics – Alicja Ulbrich";
// Opis wyniku w Google (treść od właściciela, 17.09.2026). Ten sam tekst idzie
// do Open Graph i do schematu `WebPage`, żeby sygnały się nie rozjeżdżały.
// Google i tak sam wybiera fragment do wyniku – gdy uzna treść strony za
// trafniejszą, pokaże ją zamiast tego opisu.
const HOME_DESCRIPTION =
  "Unikalna ceramika użytkowa z pracowni w okolicach Gliwic – każdy egzemplarz jest niepowtarzalny. Tworzę z pasją i dbałością o każdy detal.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "https://uniqueceramics.pl" },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "https://uniqueceramics.pl",
    // Zdjęcie hero (z panelu) jako JPEG 1200×630 z kadrem z panelu – nie logo
    // i nie WebP, którego WhatsApp nie renderuje
    images: [ogImage(OG_PAGE_IMAGE.home, "Unique Ceramics – Alicja Ulbrich")],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [OG_PAGE_IMAGE.home],
  },
};

import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import AboutTeaser from "@/components/home/AboutTeaser";
import WorkshopsTeaser from "@/components/home/WorkshopsTeaser";
import HomeScrollSnap from "@/components/home/HomeScrollSnap";
import Header from "@/components/layout/HeaderWrapper";
import FooterWithInstagram from "@/components/layout/FooterWithInstagram";
import { getSettings } from "@/lib/settings";
import { HOME_TEXT_SETTING_KEYS } from "@/lib/home-sections";
import { OG_PAGE_IMAGE, SITE_URL, absoluteUrl, ogImage } from "@/lib/seo";
import { jsonLdHtml } from "@/lib/escape-html";

export default async function Home() {
  const s = await getSettings([
    "contact_instagram",
    "home_hero_image", "home_hero_position",
    ...HOME_TEXT_SETTING_KEYS,
    "home_about_image", "home_about_position",
    "home_workshops_image", "home_workshops_position",
  ]);

  // Zdjęcie hero jako **główny obraz strony**. Wyszukiwarce nie da się
  // nakazać, które zdjęcie pokaże przy wyniku, ale `primaryImageOfPage`
  // (razem z `image` firmy w LocalBusiness i sitemapą obrazków) jest
  // najmocniejszym sygnałem, jaki możemy wysłać
  const pageSchema = s.home_hero_image
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: HOME_TITLE,
        description: HOME_DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#business` },
        inLanguage: "pl-PL",
        primaryImageOfPage: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#primaryimage`,
          url: absoluteUrl(s.home_hero_image),
          contentUrl: absoluteUrl(s.home_hero_image),
          caption: "Ręcznie robiona ceramika z pracowni Unique Ceramics",
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
      <Header hideVacation />
      <main className="flex-1">
        <Hero
          heroImage={s.home_hero_image}
          heroPosition={s.home_hero_position}
          eyebrow={s.home_hero_eyebrow}
          title={s.home_hero_title}
          text={s.home_hero_text}
          ctaPrimary={s.home_hero_cta_primary}
          ctaSecondary={s.home_hero_cta_secondary}
          scrollLabel={s.home_hero_scroll}
        />
        <FeaturedProducts />
        <AboutTeaser
          aboutImage={s.home_about_image}
          aboutPosition={s.home_about_position}
          eyebrow={s.home_about_eyebrow}
          title={s.home_about_title}
          text={s.home_about_text}
          cta={s.home_about_cta}
        />
        <WorkshopsTeaser
          workshopsImage={s.home_workshops_image}
          workshopsPosition={s.home_workshops_position}
          eyebrow={s.home_workshops_eyebrow}
          title={s.home_workshops_title}
          text={s.home_workshops_text}
          cta={s.home_workshops_cta}
        />
        {/* Treść SEO o obszarze obsługi – dostępna dla wyszukiwarek i czytników ekranu,
            niewidoczna wizualnie (sr-only). Uzupełnia areaServed w JSON-LD (app/layout.tsx).
            Świadomie NIE używamy display:none (Google traktuje to jako ukrywanie treści). */}
        <section aria-label="Obszar obsługi" className="sr-only">
          <h2>Obszar obsługi</h2>
          <p>
            Pracownię Unique Ceramics prowadzi Alicja Ulbrich – ceramiczka tworząca
            ręcznie każdą sztukę. Pracownia mieści się przy ul. Familijna 23, 44-164 Kleszczów (k. Gliwic,
            woj. śląskie). Wysyłka w całej
            Polsce – odbiór osobisty dostępny lokalnie. Obsługujemy zamówienia z całego
            Śląska: Gliwice, Zabrze, Knurów, Pyskowice, Tarnowskie Góry, Bytom, Piekary
            Śląskie, Chorzów, Ruda Śląska, Świętochłowice, Siemianowice Śląskie, Katowice,
            Mikołów, Tychy, Mysłowice, Sosnowiec, Dąbrowa Górnicza i okolice.
          </p>
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
          <FooterWithInstagram instagram={s.contact_instagram} />
        </div>
      </main>
    </>
  );
}
