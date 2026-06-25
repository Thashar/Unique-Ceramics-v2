import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Providers from "@/components/layout/Providers";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const BASE = "https://uniqueceramics.pl";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Unique Ceramics — Ceramika Gliwice | ręcznie robiona",
    template: "%s | Unique Ceramics",
  },
  description:
    "Ceramika użytkowa ręcznie robiona w Gliwicach — kubki, filiżanki, miski i naczynia. Każdy egzemplarz jest niepowtarzalny. Zamów online, wysyłka w całej Polsce.",
  keywords: [
    "ceramika Gliwice",
    "ceramika ręcznie robiona Gliwice",
    "pracownia ceramiczna Gliwice",
    "ceramika Śląsk",
    "ceramika artystyczna Śląsk",
    "ceramika ręcznie robiona",
    "ceramika artystyczna",
    "kubki ceramiczne",
    "filiżanki ceramiczne",
    "naczynia ceramiczne",
    "ceramika unikatowa",
    "handmade pottery",
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
  alternates: { canonical: BASE },
  openGraph: {
    siteName: "Unique Ceramics",
    locale: "pl_PL",
    type: "website",
    url: BASE,
    title: "Unique Ceramics — Ceramika Gliwice | ręcznie robiona",
    description:
      "Ceramika użytkowa ręcznie robiona w Gliwicach — kubki, filiżanki, miski i naczynia. Każdy egzemplarz jest niepowtarzalny. Zamów z dostawą w całej Polsce.",
    images: [
      {
        url: "/images/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Unique Ceramics — ręcznie robiona ceramika",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unique Ceramics — Ceramika Gliwice | ręcznie robiona",
    description:
      "Ceramika użytkowa ręcznie robiona w Gliwicach. Kubki, filiżanki, miski i naczynia — każdy egzemplarz niepowtarzalny.",
    images: ["/images/hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: "5KNu8ULw4D7P-wbXmsGMLp4Ly-2HeLFkq4_7Lp7ej2s",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Store"],
  "@id": `${BASE}/#business`,
  name: "Unique Ceramics",
  description:
    "Pracownia ceramiki artystycznej tworząca ręcznie robione naczynia użytkowe i dekoracyjne. Kubki, filiżanki, miski, talerze i świeczniki wykonywane z pasją — każdy egzemplarz jest niepowtarzalny.",
  url: BASE,
  logo: `${BASE}/images/logo.png`,
  image: `${BASE}/images/hero.jpg`,
  telephone: "+48668443706",
  email: "kontakt@uniqueceramics.pl",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Familijna 23",
    postalCode: "44-164",
    addressLocality: "Kleszczów",
    addressRegion: "Śląskie",
    addressCountry: "PL",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 50.3482019,
    longitude: 18.5182082,
  },
  hasMap: "https://maps.google.com/?q=Familijna+23,+44-164+Kleszczów",
  priceRange: "$$",
  currenciesAccepted: "PLN",
  paymentAccepted: "Bank Transfer, BLIK",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:00",
    },
  ],
  areaServed: [
    { "@type": "City", name: "Gliwice" },
    { "@type": "City", name: "Zabrze" },
    { "@type": "City", name: "Bytom" },
    { "@type": "City", name: "Ruda Śląska" },
    { "@type": "City", name: "Tychy" },
    { "@type": "City", name: "Katowice" },
    { "@type": "Country", name: "Polska" },
  ],
  sameAs: ["https://www.instagram.com/unique.ceramics"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Ceramika artystyczna",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Kubki ceramiczne" },
      { "@type": "OfferCatalog", name: "Filiżanki ceramiczne" },
      { "@type": "OfferCatalog", name: "Miski i naczynia" },
      { "@type": "OfferCatalog", name: "Talerze ceramiczne" },
      { "@type": "OfferCatalog", name: "Świeczniki ceramiczne" },
    ],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE}/#website`,
  name: "Unique Ceramics",
  url: BASE,
  description: "Sklep z ręcznie robioną ceramiką artystyczną",
  inLanguage: "pl-PL",
  publisher: { "@id": `${BASE}/#business` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE}/sklep?kategoria={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${playfair.variable} ${inter.variable} h-full`}>
      <head>
        {/* Blokuj przywracanie pozycji scrolla przez przeglądarkę na stronie głównej.
            Musi działać przed DOMContentLoaded, zanim Chrome zdąży przywrócić scroll —
            ustawienie tego w useEffect jest za późno i powoduje biały header przy odświeżeniu. */}
        <script dangerouslySetInnerHTML={{ __html: `if(location.pathname==='/')history.scrollRestoration='manual';` }} />
      </head>
      <body className="min-h-[100svh] flex flex-col">
        <Providers>{children}</Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </body>
    </html>
  );
}
