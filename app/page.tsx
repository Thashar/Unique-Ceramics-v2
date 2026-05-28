export const dynamic = "force-dynamic";

import Hero from "@/components/home/Hero";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import AboutTeaser from "@/components/home/AboutTeaser";
import WorkshopsTeaser from "@/components/home/WorkshopsTeaser";
import InstagramCta from "@/components/home/InstagramCta";
import HomeScrollSnap from "@/components/home/HomeScrollSnap";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSettings } from "@/lib/settings";

export default async function Home() {
  const s = await getSettings(["contact_instagram"]);

  return (
    <>
      <HomeScrollSnap />
      <Header />
      <main className="flex-1">
        <Hero />
        <FeaturedProducts />
        <AboutTeaser />
        <WorkshopsTeaser />
        <InstagramCta instagram={s.contact_instagram} />
        {/* Stopka jako ostatni snap-punkt */}
        <div data-snap>
          <Footer />
        </div>
      </main>
    </>
  );
}
