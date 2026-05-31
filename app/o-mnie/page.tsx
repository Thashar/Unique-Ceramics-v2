export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSettings } from "@/lib/settings";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

export const metadata: Metadata = {
  title: "O mnie",
  description:
    "Poznaj historię Unique Ceramics — pracowni ceramicznej z okolic Gliwic. Ręcznie robiona ceramika tworzona z pasji do gliny na Śląsku.",
  alternates: { canonical: "https://uniqueceramics.pl/o-mnie" },
};

export default async function AboutPage() {
  const s = await getSettings(["about_hero_image", "about_story"]);
  const heroImage = s.about_hero_image || "/images/about-photo.jpg";
  const story = s.about_story;

  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        {/* Hero */}
        <div className="relative h-[55vh] overflow-hidden">
          <Image
            src={heroImage}
            alt="Pracownia ceramiczna"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-espresso/50" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full pb-16">
              <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-3">Pracownia</p>
              <h1 className="font-serif text-5xl md:text-6xl text-cream">O mnie</h1>
            </div>
          </div>
        </div>

        {/* Treść */}
        <div className="bg-warm-white py-24 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Tekst główny */}
            <div className="lg:col-span-7">
              <h2 className="font-serif text-3xl text-espresso mb-8 leading-snug">
                „Ręcznie tworzone z sercem"
              </h2>
              <div
                className="space-y-5 text-charcoal/80 leading-relaxed [&_p]:mb-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-espresso [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_strong]:text-espresso"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(story) }}
              />

              <div className="mt-12 flex flex-wrap gap-6">
                <Link
                  href="/sklep"
                  className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors group"
                >
                  Moje prace
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </Link>
                <Link
                  href="/zamowienie-indywidualne"
                  className="inline-flex items-center gap-2 border border-espresso hover:bg-espresso hover:text-cream text-espresso text-sm tracking-widest uppercase px-8 py-4 transition-colors"
                >
                  Zamówienie indywidualne
                </Link>
              </div>
            </div>

            {/* Sidebar ze zdjęciem */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm">
                <Image
                  src={heroImage}
                  alt="Przy pracy"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Wartości */}
        <div className="bg-cream py-20 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl text-espresso mb-12 text-center">Jak pracuję</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { title: "Ręcznie", text: "Każdy przedmiot tworzę osobiście. Nie korzystam z produkcji seryjnej ani odlewów." },
                { title: "Z uwagą", text: "Dbam o każdy detal — od kształtu, przez glazurę, aż po opakowanie." },
                { title: "Z pasją", text: "Ceramika to nie tylko zawód — to sposób, w jaki postrzegam i tworzę piękno." },
              ].map(({ title, text }) => (
                <div key={title} className="text-center">
                  <h3 className="font-serif text-2xl text-espresso mb-4">{title}</h3>
                  <p className="text-charcoal/70 leading-relaxed text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
