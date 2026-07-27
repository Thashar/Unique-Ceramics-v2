import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Providers from "@/components/layout/Providers";
import LocalBusinessSchema from "@/components/seo/LocalBusinessSchema";
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
    default: "Unique Ceramics – Ceramika Gliwice | ręcznie robiona",
    template: "%s | Unique Ceramics",
  },
  description:
    "Ceramika użytkowa ręcznie robiona w Gliwicach – kubki, filiżanki, miski i naczynia. Każdy egzemplarz jest niepowtarzalny. Zamów online, wysyłka w całej Polsce.",
  keywords: [
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
    "filiżanki ceramiczne",
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
  alternates: { canonical: BASE },
  openGraph: {
    siteName: "Unique Ceramics",
    locale: "pl_PL",
    type: "website",
    url: BASE,
    title: "Unique Ceramics – Ceramika Gliwice | ręcznie robiona",
    description:
      "Ceramika użytkowa ręcznie robiona w Gliwicach – kubki, filiżanki, miski i naczynia. Każdy egzemplarz jest niepowtarzalny. Zamów z dostawą w całej Polsce.",
    images: [
      {
        url: "/images/OpenGraph.webp",
        width: 1200,
        height: 630,
        alt: "Unique Ceramics – ręcznie robiona ceramika",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unique Ceramics – Ceramika Gliwice | ręcznie robiona",
    description:
      "Ceramika użytkowa ręcznie robiona w Gliwicach. Kubki, filiżanki, miski i naczynia – każdy egzemplarz niepowtarzalny.",
    images: ["/images/OpenGraph.webp"],
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${playfair.variable} ${inter.variable} h-full`}>
      <head>
        {/* Blokuj przywracanie pozycji scrolla przez przeglądarkę na stronie głównej.
            Musi działać przed DOMContentLoaded, zanim Chrome zdąży przywrócić scroll –
            ustawienie tego w useEffect jest za późno i powoduje biały header przy odświeżeniu. */}
        <script dangerouslySetInnerHTML={{ __html: `if(location.pathname==='/')history.scrollRestoration='manual';` }} />
      </head>
      <body className="min-h-[100svh] flex flex-col">
        <Providers>{children}</Providers>
        {/* Dane strukturalne (LocalBusiness + WebSite) – adres, telefon i godziny
            otwarcia czytane z ustawień panelu admina */}
        <LocalBusinessSchema />
      </body>
    </html>
  );
}
