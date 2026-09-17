import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import SiteAnalytics from "@/components/layout/SiteAnalytics";
import Providers from "@/components/layout/Providers";
import { COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";
import LocalBusinessSchema from "@/components/seo/LocalBusinessSchema";
import { OG_IMAGE } from "@/lib/seo";
import "./globals.css";

// ⚠️ **`preload: false` jest celowe – nie włączaj go z powrotem.**
// Oba kroje są **zmienne** (jeden plik na krój i podzbiór, niezależnie od wagi),
// więc `weight` nie zmniejsza ich ani o bajt – sprawdzone. Cztery pliki
// (Inter latin 85 kB + latin-ext 48 kB, Playfair latin 38 kB + latin-ext 21 kB)
// to **189 kB**, a `next/font` wstawiał je jako `<link rel="preload" as="font">`
// w `<head>`, czyli z najwyższym priorytetem – przed zdjęciem hero, które jest
// elementem LCP. Zdjęcie dostawało przez to ułamek pasma i schodziło z sieci
// jako jedno z ostatnich (LCP 5,7 s przy FCP 1,2 s – PageSpeed, 14.09.2026).
//
// Bez preloadu nic nie tracimy na pierwszym malowaniu: `display: "swap"` i tak
// rysuje tekst krojem zastępczym od razu, a Next dokłada do niego `size-adjust`
// i `ascent-override` (`Playfair Display Fallback`), więc podmiana kroju
// **nie przesuwa układu** – CLS zostaje 0. Kroje dociągają się zaraz po pierwszym
// malowaniu, już bez konkurowania z LCP.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const BASE = "https://uniqueceramics.pl";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Unique Ceramics - Alicja Ulbrich",
    template: "%s | Unique Ceramics",
  },
  description:
    "Ręcznie robiona ceramika Alicji Ulbrich z okolic Gliwic – kubki, miski, naczynia i ozdoby. Każdy egzemplarz jest niepowtarzalny. Zamów online, wysyłka w całej Polsce.",
  keywords: [
    "Alicja Ulbrich",
    "Alicja Ulbrich ceramika",
    "ceramika Gliwice",
    "ceramika ręcznie robiona Gliwice",
    "pracownia ceramiczna Gliwice",
    "sklep ceramiczny",
    "sklep z ceramiką",
    "sklep ceramiczny Gliwice",
    "ceramika Śląsk",
    "ceramika artystyczna Śląsk",
    "ceramika ręcznie robiona",
    "ceramika artystyczna",
    "kubki ceramiczne",
    "naczynia ceramiczne",
    "ceramika unikatowa",
    "handmade pottery",
    "warsztaty ceramiczne",
    "warsztaty ceramiczne Gliwice",
    "zamówienie indywidualne ceramika",
    "unique ceramics",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  authors: [{ name: "Unique Ceramics", url: BASE }],
  creator: "Unique Ceramics",
  publisher: "Unique Ceramics",
  // UWAGA: **nie ustawiaj tu `alternates.canonical`** – metadane dziedziczą się
  // w dół, więc każda podstrona bez własnego canonicala ogłaszałaby się kopią
  // strony głównej. Canonical strony głównej siedzi w `app/page.tsx`,
  // a podstrony biorą go z `pageMetadata()` (`lib/seo.ts`).
  openGraph: {
    siteName: "Unique Ceramics",
    locale: "pl_PL",
    type: "website",
    url: BASE,
    title: "Unique Ceramics - Alicja Ulbrich",
    description:
      "Ręcznie robiona ceramika Alicji Ulbrich z okolic Gliwic – kubki, miski, naczynia i ozdoby. Każdy egzemplarz jest niepowtarzalny. Zamów z dostawą w całej Polsce.",
    // Hero ze strony głównej jako JPEG (trasa `/api/og/strona/glowna`; bez
    // wgranego hero oddaje statyczną `OpenGraph.jpg`)
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unique Ceramics - Alicja Ulbrich",
    description:
      "Ręcznie robiona ceramika Alicji Ulbrich z okolic Gliwic. Kubki, miski, naczynia i ozdoby – każdy egzemplarz niepowtarzalny.",
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // O tym, KTÓRE zdjęcie trafia do wyniku wyszukiwania, decyduje Google.
      // Bez `max-image-preview: large` wolno mu pokazać najwyżej miniaturkę
      // albo nic – to jedyne ustawienie, którym w ogóle na to wpływamy.
      // `-1` = bez limitu długości opisu i podglądu wideo.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "5KNu8ULw4D7P-wbXmsGMLp4Ly-2HeLFkq4_7Lp7ej2s",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${playfair.variable} ${inter.variable} h-full`}>
      <head>
        {/* Dwie rzeczy, które muszą wykonać się PRZED pierwszym malowaniem.
            1. Blokada przywracania pozycji scrolla na stronie głównej – w useEffect
               jest za późno, Chrome zdąży przywrócić scroll (biały header przy odświeżeniu).
            2. Ukrycie banera cookies u kogoś, kto już wybrał. Baner jest w HTML
               z serwera (patrz `CookieBanner` – był elementem LCP z 2290 ms
               opóźnienia renderowania, bo czekał na hydratację), więc bez tego
               mignąłby każdemu, kto zgodę już zapisał. Reguła CSS siedzi
               w `app/globals.css` (`html[data-cc] .uc-cookie-banner`). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              // Strona główna w obu językach (`/` i `/en`) ma scroll-snap
              `if(location.pathname==='/'||location.pathname==='/en')history.scrollRestoration='manual';` +
              `try{var c=localStorage.getItem('${COOKIE_CONSENT_KEY}');` +
              `if(c==='all'||c==='necessary')document.documentElement.setAttribute('data-cc','1')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-[100svh] flex flex-col">
        <Providers>{children}</Providers>
        {/* Dane strukturalne (LocalBusiness + WebSite) – adres, telefon i godziny
            otwarcia czytane z ustawień panelu admina */}
        <LocalBusinessSchema />
        {/* Vercel Web Analytics – odwiedziny i widoki stron bez cookies; odsłony
            panelu admina są odrzucane w `SiteAnalytics`. Na produkcji skrypt idzie
            z własnej domeny (`/_vercel/insights/*`), w trybie deweloperskim
            z `va.vercel-scripts.com` (jest w CSP). */}
        <SiteAnalytics />
      </body>
    </html>
  );
}
