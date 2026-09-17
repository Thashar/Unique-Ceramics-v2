// Wspólne metadane podglądu linku (Open Graph + Twitter) dla stron publicznych.
//
// Dwie rzeczy, przez które podglądy potrafią wyjść puste:
// 1. Obrazek musi być w JPEG/PNG – WhatsApp nie renderuje WebP w podglądach linków.
// 2. W Next.js `openGraph`/`twitter` ze strony ZASTĘPUJE ten z layoutu w całości,
//    więc siteName/locale/type trzeba powtarzać przy każdej stronie. Ten helper
//    robi to za nas – używaj go zamiast pisania bloku openGraph ręcznie.

import type { Metadata } from "next";
import { OG_LOCALE, hasEnglishVersion, localePath, stripLocale, type Locale } from "./i18n";

export const SITE_URL = "https://uniqueceramics.pl";
export const SITE_NAME = "Unique Ceramics";

/**
 * Obrazek podglądu linku pod adresem jednej z tras `/api/og/*` – każda oddaje
 * JPEG 1200×630 z prawdziwego zdjęcia (patrz `lib/og-image.ts`). `width`/
 * `height`/`type` są podane wprost, bo bez nich część komunikatorów pokazuje
 * mały kafelek zamiast dużego obrazka.
 */
export function ogImage(url: string, alt = "Unique Ceramics – ręcznie robiona ceramika") {
  return { url, width: 1200, height: 630, type: "image/jpeg", alt };
}

/**
 * Domyślny obrazek podglądu = **zdjęcie hero ze strony głównej** (ustawiane
 * w panelu; trasa `/api/og/strona/glowna` oddaje je jako JPEG z kadrem
 * z panelu, a bez wgranego hero – statyczną `/images/OpenGraph.jpg`).
 * Strony z własnym nagłówkiem (O mnie, Warsztaty), produkty, kategorie
 * i projekty podają własny obrazek przez `ogImage`.
 */
export const OG_IMAGE = ogImage("/api/og/strona/glowna");

/** Adresy obrazków podglądu dla stron z własnym nagłówkiem. */
export const OG_PAGE_IMAGE = {
  home: "/api/og/strona/glowna",
  about: "/api/og/strona/o-mnie",
  workshops: "/api/og/strona/warsztaty",
} as const;

type PageMetaInput = {
  /** Tytuł strony (bez sufiksu marki – dodaje go szablon z layoutu). */
  title: string;
  description: string;
  /** Ścieżka bez domeny, np. "/sklep". */
  path: string;
  /** Tytuł w podglądzie linku, gdy ma być inny niż tytuł strony. */
  ogTitle?: string;
  /** Własny obrazek podglądu (np. zdjęcie produktu) – musi być JPEG/PNG. */
  image?: typeof OG_IMAGE;
  /** Strony prywatne (koszyk, konto) – bez indeksowania. */
  noIndex?: boolean;
  /**
   * Język strony. Po angielsku canonical wskazuje `/en/...`, a `hreflang`
   * spina obie wersje; po polsku `hreflang` pojawia się tylko tam, gdzie
   * wersja angielska istnieje (patrz `hasEnglishVersion`).
   */
  locale?: Locale;
};

/**
 * Wpisy `hreflang` dla polskiej ścieżki (bez prefiksu): polska wersja jest
 * też `x-default`. Strona bez odpowiednika po angielsku nie dostaje nic.
 */
export function languageAlternates(plainPath: string): Record<string, string> | undefined {
  const clean = stripLocale(plainPath);
  if (!hasEnglishVersion(clean)) return undefined;
  const pl = `${SITE_URL}${clean}`;
  return { pl, en: `${SITE_URL}${localePath("en", clean)}`, "x-default": pl };
}

/** Buduje komplet metadanych strony: opis, canonical, Open Graph i kartę Twitter. */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
  image = OG_IMAGE,
  noIndex,
  locale = "pl",
}: PageMetaInput): Metadata {
  const url = `${SITE_URL}${localePath(locale, path)}`;
  const socialTitle = ogTitle ?? `${title} – ${SITE_NAME}`;
  const languages = noIndex ? undefined : languageAlternates(path);

  return {
    title,
    description,
    alternates: { canonical: url, ...(languages ? { languages } : {}) },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      url,
      title: socialTitle,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image.url],
    },
  };
}

/**
 * Ścieżka względna → pełny adres. JSON-LD i podglądy linków wymagają adresów
 * absolutnych; zdjęcia produktów bywają z naszego Storage (już absolutne),
 * a starsze siedzą w `public/` jako `/images/...`.
 */
export function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Skraca tekst do długości meta description. Opis produktu z panelu bywa
 * wielokrotnie dłuższy i ma nowe wiersze, a wyszukiwarka i tak utnie go
 * w połowie zdania – lepiej uciąć samemu, na granicy słowa.
 */
export function metaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.replace(/[.,;:–-]+$/, "")}…`;
}
