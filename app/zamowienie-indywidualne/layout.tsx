import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zamówienie indywidualne",
  description:
    "Zamów ceramikę na miarę — zestawy ślubne, prezenty firmowe, naczynia z personalizacją. Każde zamówienie indywidualne jest realizowane ręcznie z pasją.",
  alternates: { canonical: "https://uniqueceramics.pl/zamowienie-indywidualne" },
  openGraph: {
    title: "Zamówienie indywidualne — Unique Ceramics",
    description:
      "Ceramika na zamówienie: zestawy ślubne, prezenty firmowe, personalizacja. Czas realizacji 4+ tygodnie.",
    url: "https://uniqueceramics.pl/zamowienie-indywidualne",
    images: [
      {
        url: "/images/OpenGraph.jpg",
        width: 1200,
        height: 630,
        alt: "Zamówienie indywidualne ceramiki — Unique Ceramics",
      },
    ],
  },
};

export default function CustomOrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
