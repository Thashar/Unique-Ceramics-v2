export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  type LucideIcon,
  Cake, Gem, Building2, Leaf, Users, Gift,
  Package, GraduationCap, Flame, Camera, Coffee, CheckCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Warsztaty",
  description: "Warsztaty ceramiczne w małych grupach — dla początkujących i zaawansowanych.",
};

type Workshop = {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  duration: string;
  maxPeople: string;
  priceLabel: string;
  level: string;
};

const workshops: Workshop[] = [
  { id: 1, icon: Cake,      title: "Warsztaty urodzinowe",  description: "Wyjątkowe urodziny w towarzystwie gliny! Idealne dla grup od 4 osób. W trakcie warsztatu uformujecie własne wyroby z gliny, które po wypaleniu możecie odebrać lub wysłać pocztą.", duration: "3–4 godziny", maxPeople: "od 4 osób",           priceLabel: "od 80 zł / os.",      level: "Każdy poziom" },
  { id: 2, icon: Gem,       title: "Wieczory panieńskie",   description: "Niezapomniane wieczory panieńskie z ceramiką. Możliwość degustacji wina. Każda uczestniczka wychodzi z własnoręcznie wykonanym, unikatowym dziełem.",                                         duration: "3–4 godziny", maxPeople: "od 4 osób",           priceLabel: "od 100 zł / os.",     level: "Każdy poziom" },
  { id: 3, icon: Building2, title: "Team Building",         description: "Integracja przez ceramikę dla firm i grup zawodowych. Doskonała alternatywa dla standardowych eventów — kreatywna, angażująca i pełna niespodzianek.",                                         duration: "Do ustalenia", maxPeople: "wycena indywidualna", priceLabel: "wycena indywidualna", level: "Każdy poziom" },
  { id: 4, icon: Leaf,      title: "Warsztaty otwarte",     description: "Regularne warsztaty dla osób indywidualnych. Poznasz podstawy pracy z gliną — toczenie na kole lub hand-building. Nie potrzebujesz żadnego doświadczenia.",                                   duration: "3 godziny",    maxPeople: "małe grupy",          priceLabel: "od 90 zł / os.",      level: "Każdy poziom" },
  { id: 5, icon: Users,     title: "Dla dzieci i rodzin",   description: "Warsztaty dla dzieci od 8 lat i całych rodzin. Bezpieczne materiały, przystępna forma, mnóstwo frajdy i niepowtarzalne wspomnienia.",                                                           duration: "2–3 godziny",  maxPeople: "rodziny i grupy",     priceLabel: "od 60 zł / os.",      level: "Dzieci od 8 lat" },
  { id: 6, icon: Gift,      title: "Vouchery prezentowe",   description: "Podaruj komuś wyjątkowe doświadczenie! Vouchery na dowolny rodzaj warsztatów. Idealne na urodziny, imieniny, Dzień Matki lub po prostu z okazji.",                                             duration: "według wybranego warsztatu", maxPeople: "dla 1 osoby lub pary", priceLabel: "od 80 zł", level: "Każdy poziom" },
];

const includes: { icon: LucideIcon; label: string }[] = [
  { icon: Package,       label: "Materiały (glina, narzędzia)" },
  { icon: GraduationCap, label: "Prowadzenie przez ceramiczkę" },
  { icon: Flame,         label: "Wypalanie Twoich prac" },
  { icon: CheckCircle,   label: "Gotowe wyroby do odbioru" },
  { icon: Camera,        label: "Pamiątkowe zdjęcia" },
  { icon: Coffee,        label: "Napoje podczas warsztatów" },
];

export default async function WorkshopsPage() {
  const s = await getSettings(["workshops_hero_image", "workshops_intro", "contact_phone"]);
  const heroImage = s.workshops_hero_image || "/images/warsztaty-photo.jpg";
  const intro = s.workshops_intro;
  const phone = s.contact_phone;

  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        {/* Hero */}
        <div className="relative h-[55vh] overflow-hidden">
          <Image src={heroImage} alt="Warsztaty ceramiczne" fill priority className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-espresso/60" />
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 w-full pb-16">
              <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-3">Nauka</p>
              <h1 className="font-serif text-5xl md:text-6xl text-cream">Warsztaty</h1>
            </div>
          </div>
        </div>

        {/* Lead */}
        <div className="bg-cream py-16 px-6 lg:px-10">
          <div
            className="max-w-3xl mx-auto text-center text-charcoal/80 text-lg leading-relaxed [&_p]:mb-4 [&_strong]:text-espresso"
            dangerouslySetInnerHTML={{ __html: intro }}
          />
        </div>

        {/* Lista warsztatów */}
        <div className="bg-warm-white py-20 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto space-y-12">
            {workshops.map((w) => (
              <div key={w.id} className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-b border-sand pb-12 last:border-0 last:pb-0">
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-cream rounded-full flex items-center justify-center shrink-0">
                      <w.icon size={18} strokeWidth={1.5} className="text-clay" />
                    </div>
                    <span className="text-xs tracking-widest uppercase text-clay">{w.level}</span>
                  </div>
                  <h2 className="font-serif text-3xl text-espresso mb-4">{w.title}</h2>
                  <p className="text-charcoal/75 leading-relaxed mb-6">{w.description}</p>
                </div>
                <div className="bg-cream p-8 self-start">
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-charcoal/60">Czas trwania</span>
                      <span className="text-espresso font-medium">{w.duration}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-charcoal/60">Liczba uczestników</span>
                      <span className="text-espresso font-medium">{w.maxPeople}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-sand pt-3">
                      <span className="text-charcoal/60">Cena</span>
                      <span className="font-serif text-xl text-espresso">{w.priceLabel}</span>
                    </div>
                  </div>
                  <Link href="/kontakt" className="block text-center bg-terracotta hover:bg-clay text-warm-white text-xs tracking-widest uppercase py-4 transition-colors">
                    Zarezerwuj
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Co zawiera warsztat */}
        <div className="bg-cream py-20 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl text-espresso mb-12 text-center">Co zawiera warsztat?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {includes.map(({ icon: Icon, label }) => (
                <div key={label} className="bg-warm-white p-6 text-center">
                  <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon size={18} strokeWidth={1.5} className="text-clay" />
                  </div>
                  <p className="text-sm text-charcoal/75 leading-relaxed">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-mist py-20 px-6 lg:px-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-3xl text-espresso mb-12 text-center">Często zadawane pytania</h2>
            <div className="space-y-8">
              {[
                ["Co muszę zabrać?", "Nic — wszystkie materiały są zapewnione. Warto mieć na sobie ubranie, które może się zabrudzić (glina to glina)."],
                ["Czy otrzymam swoje prace?", "Tak! Przedmioty po wysuszeniu i wypaleniu możesz odebrać osobiście lub wyślę je pocztą."],
                ["Kiedy dostanę gotowe prace?", "Wypalanie trwa ok. 2–3 tygodni od warsztatów. Poinformuję Cię, gdy prace będą gotowe."],
                ["Czy mogę kupić voucher na warsztaty?", "Tak, zapraszam do kontaktu — wystawiam vouchery podarunkowe od 80 zł."],
                ["Jak zarezerwować miejsce?", `Napisz do mnie przez formularz kontaktowy lub zadzwoń pod numer ${phone}.`],
              ].map(([q, a]) => (
                <div key={q} className="border-b border-sand pb-8 last:border-0 last:pb-0">
                  <h3 className="font-serif text-xl text-espresso mb-3">{q}</h3>
                  <p className="text-charcoal/70 leading-relaxed text-sm">{a}</p>
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
