import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "O mnie",
  description: "Poznaj historię Unique Ceramics — pracowni ceramicznej i pasji do gliny.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        {/* Hero */}
        <div className="relative h-[55vh] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=1600&q=85"
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
              <div className="space-y-5 text-charcoal/80 leading-relaxed">
                <p>
                  Od 20 lat zajmuję się ceramiką w obszarze przemysłu, dlatego moje
                  doświadczenie przeniosłam na ceramikę artystyczną, którą zajmuję się
                  od około roku. Tworzenie unikatowych prac stało się dla mnie prawdziwą
                  pasją i sposobem na wyrażanie kreatywności.
                </p>
                <p>
                  W tym czasie stworzyłam własną, kameralną pracownię, w której powstają
                  ręcznie wykonywane przedmioty użytkowe i dekoracyjne. Swoją inspirację
                  czerpię przede wszystkim z prostych form oraz rzemiosła artystycznego.
                </p>
                <p>
                  Każdą pracę wykonuję samodzielnie, dbając o detale, estetykę i niepowtarzalny
                  charakter wyrobów. Ceramika daje mi ogromną satysfakcję oraz pozwala
                  odnaleźć wewnętrzny spokój i chwilę wyciszenia w tym jakże zabieganym świecie.
                </p>
                <p>
                  Daje mi to też motywację do ciągłego rozwijania swoich umiejętności
                  oraz poszukiwania nowych pomysłów i technik.
                </p>
              </div>

              <div className="mt-12 flex flex-wrap gap-6">
                <Link
                  href="/sklep"
                  className="inline-flex items-center gap-2 bg-terracotta hover:bg-clay text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors group"
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
                  src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=85"
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
                {
                  title: "Ręcznie",
                  text: "Każdy przedmiot tworzę osobiście. Nie korzystam z produkcji seryjnej ani odlewów.",
                },
                {
                  title: "Z uwagą",
                  text: "Dbam o każdy detal — od kształtu, przez glazurę, aż po opakowanie.",
                },
                {
                  title: "Z pasją",
                  text: "Ceramika to nie tylko zawód — to sposób, w jaki postrzegam i tworzę piękno.",
                },
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
