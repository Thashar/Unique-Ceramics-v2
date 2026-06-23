import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Unique Ceramics — Ceramika Gliwice",
  description:
    "Pracownia ceramiczna z okolic Gliwic. Ręcznie robiona ceramika użytkowa i dekoracyjna — kubki, filiżanki, miski, naczynia. Każdy egzemplarz jest niepowtarzalny.",
  alternates: { canonical: "https://uniqueceramics.pl" },
  openGraph: {
    title: "Unique Ceramics — Ceramika Gliwice",
    description:
      "Pracownia ceramiczna z okolic Gliwic. Ręcznie robiona ceramika użytkowa i dekoracyjna — każdy egzemplarz jest niepowtarzalny.",
    url: "https://uniqueceramics.pl",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "Unique Ceramics — ręcznie robiona ceramika",
      },
    ],
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

export default async function Home() {
  const s = await getSettings([
    "contact_instagram",
    "home_hero_image", "home_hero_position",
    "home_about_image", "home_about_position",
    "home_workshops_image", "home_workshops_position",
  ]);

  return (
    <>
      <HomeScrollSnap />
      <Header hideVacation />
      <main className="flex-1">
        <Hero heroImage={s.home_hero_image} heroPosition={s.home_hero_position} />
        <FeaturedProducts />
        <AboutTeaser aboutImage={s.home_about_image} aboutPosition={s.home_about_position} />
        <WorkshopsTeaser workshopsImage={s.home_workshops_image} workshopsPosition={s.home_workshops_position} />
        {/* Stopka z Instagramem — pt-20 kompensuje header, min-h-svh wypełnia viewport */}
        <div data-snap className="bg-espresso min-h-svh lg:h-svh flex flex-col">
          <FooterWithInstagram instagram={s.contact_instagram} />
        </div>
      </main>
    </>
  );
}
