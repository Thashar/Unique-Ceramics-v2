// Wspólne metadane podglądu linku (Open Graph + Twitter) dla stron publicznych.
//
// Dwie rzeczy, przez które podglądy potrafią wyjść puste:
// 1. Obrazek musi być w JPEG/PNG – WhatsApp nie renderuje WebP w podglądach linków.
// 2. W Next.js `openGraph`/`twitter` ze strony ZASTĘPUJE ten z layoutu w całości,
//    więc siteName/locale/type trzeba powtarzać przy każdej stronie. Ten helper
//    robi to za nas – używaj go zamiast pisania bloku openGraph ręcznie.

import type { Metadata } from "next";

export const SITE_URL = "https://uniqueceramics.pl";
export const SITE_NAME = "Unique Ceramics";

/** Domyślny obrazek podglądu. JPEG, nie WebP – patrz komentarz wyżej. */
export const OG_IMAGE = {
  url: "/images/OpenGraph.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Unique Ceramics – ręcznie robiona ceramika",
};

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
};

/** Buduje komplet metadanych strony: opis, canonical, Open Graph i kartę Twitter. */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
  image = OG_IMAGE,
  noIndex,
}: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const socialTitle = ogTitle ?? `${title} – ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "pl_PL",
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
