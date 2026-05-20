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

export const metadata: Metadata = {
  title: {
    default: "Unique Ceramics — Ceramika ręcznie robiona",
    template: "%s | Unique Ceramics",
  },
  description:
    "Ręcznie robiona ceramika użytkowa i dekoracyjna. Każdy przedmiot jest niepowtarzalny, tworzony z pasją i dbałością o każdy detal.",
  keywords: ["ceramika", "ręcznie robiona", "ceramika artystyczna", "pottery", "handmade"],
  openGraph: {
    siteName: "Unique Ceramics",
    locale: "pl_PL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${playfair.variable} ${inter.variable} h-full`}>
      <body className="min-h-[100svh] flex flex-col">
          <Providers>{children}</Providers>
        </body>
    </html>
  );
}
