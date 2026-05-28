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
  maximumScale: 1,
  userScalable: false,
};

const BASE = "https://uniqueceramics.pl";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Unique Ceramics — Ceramika ręcznie robiona",
    template: "%s | Unique Ceramics",
  },
  description:
    "Ręcznie robiona ceramika użytkowa i dekoracyjna. Kubki, filiżanki, miski i naczynia tworzone z pasją — każdy egzemplarz jest niepowtarzalny.",
  keywords: [
    "ceramika ręcznie robiona",
    "ceramika artystyczna",
    "kubki ceramiczne",
    "filiżanki ceramiczne",
    "naczynia ceramiczne",
    "ceramika unikatowa",
    "handmade pottery",
    "warsztaty ceramiczne",
    "zamówienie indywidualne ceramika",
    "unique ceramics",
  ],
  authors: [{ name: "Unique Ceramics", url: BASE }],
  creator: "Unique Ceramics",
  publisher: "Unique Ceramics",
  alternates: { canonical: BASE },
  icons: {
    icon: [{ url: "/images/logo.png", type: "image/png" }],
    apple: "/images/logo.png",
    shortcut: "/images/logo.png",
  },
  openGraph: {
    siteName: "Unique Ceramics",
    locale: "pl_PL",
    type: "website",
    url: BASE,
    title: "Unique Ceramics — Ceramika ręcznie robiona",
    description:
      "Ręcznie robiona ceramika użytkowa i dekoracyjna. Kubki, filiżanki, miski i naczynia tworzone z pasją.",
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
    title: "Unique Ceramics — Ceramika ręcznie robiona",
    description:
      "Ręcznie robiona ceramika użytkowa i dekoracyjna. Każdy egzemplarz jest niepowtarzalny.",
    images: ["/images/hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Store"],
  "@id": `${BASE}/#business`,
  name: "Unique Ceramics",
  description:
    "Pracownia ceramiki artystycznej tworząca ręcznie robione naczynia użytkowe i dekoracyjne. Kubki, filiżanki, miski, talerze i swieczniki wykonywane z pasją — każdy egzemplarz jest niepowtarzalny.",
  url: BASE,
  logo: `${BASE}/images/logo.png`,
  image: `${BASE}/images/hero.jpg`,
  telephone: "+48668443706",
  email: "kontakt@uniqueceramics.pl",
  priceRange: "$$",
  currenciesAccepted: "PLN",
  paymentAccepted: "Bank Transfer, Credit Card, BLIK",
  inLanguage: "pl-PL",
  areaServed: {
    "@type": "Country",
    name: "Polska",
  },
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${playfair.variable} ${inter.variable} h-full`}>
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
