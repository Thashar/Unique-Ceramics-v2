// Strona główna cachowana ISR — ustawienia zmieniają się rzadko
export const revalidate = 3600;

import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import AboutTeaser from "@/components/home/AboutTeaser";
import WorkshopsTeaser from "@/components/home/WorkshopsTeaser";
import HomeScrollSnap from "@/components/home/HomeScrollSnap";
import Header from "@/components/layout/Header";
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
      <Header />
      <main className="flex-1">
        <Hero heroImage={s.home_hero_image} heroPosition={s.home_hero_position} />
        <FeaturedProducts />
        <AboutTeaser aboutImage={s.home_about_image} aboutPosition={s.home_about_position} />
        <WorkshopsTeaser workshopsImage={s.home_workshops_image} workshopsPosition={s.home_workshops_position} />
        {/* Stopka z Instagramem — pt-20 kompensuje header, min-h-svh wypełnia viewport */}
        <div data-snap className="pt-20 bg-espresso min-h-svh flex flex-col">
          <FooterWithInstagram instagram={s.contact_instagram} />
        </div>
      </main>
    </>
  );
}
