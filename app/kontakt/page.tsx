// Treść zmienia się rzadko — ISR; zapis ustawień w adminie odświeża cache
export const revalidate = 300;

import type { Metadata } from "next";
import { Phone, Mail, Clock, MapPin } from "lucide-react";
import InstagramIcon from "@/components/ui/InstagramIcon";
import Header from "@/components/layout/HeaderWrapper";
import Footer from "@/components/layout/Footer";
import { getSettings } from "@/lib/settings";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Skontaktuj się z pracownią ceramiczną Unique Ceramics — Kleszczów, okolice Gliwic. Telefon, e-mail, Instagram.",
  alternates: { canonical: "https://uniqueceramics.pl/kontakt" },
};

function parseWorkshopTitles(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((w: { active?: boolean; title?: string }) => w.active && w.title)
      .map((w: { title: string }) => w.title);
  } catch {
    return [];
  }
}

export default async function ContactPage() {
  const settings = await getSettings([
    "contact_phone",
    "contact_email",
    "contact_instagram",
    "workshops_offers",
  ]);

  const phone = settings.contact_phone;
  const email = settings.contact_email;
  const instagram = settings.contact_instagram;
  const workshopOptions = parseWorkshopTitles(settings.workshops_offers);

  // Derive href from instagram handle (strip leading @)
  const instagramHandle = instagram.startsWith("@")
    ? instagram.slice(1)
    : instagram;
  const instagramHref = `https://instagram.com/${instagramHandle}`;

  // Derive tel href (strip spaces)
  const phoneHref = `tel:${phone.replace(/\s/g, "")}`;

  return (
    <>
      <Header />
      <main className="flex-1 pt-[100px]">
        {/* Nagłówek */}
        <div className="bg-cream px-6 lg:px-10 py-10">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Napisz do mnie</p>
            <h1 className="font-serif text-5xl md:text-6xl text-espresso">Kontakt</h1>
          </div>
        </div>

        {/* Siatka */}
        <div className="bg-warm-white py-20 px-6 lg:px-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Dane kontaktowe */}
            <div>
              <h2 className="font-serif text-2xl text-espresso mb-8">Dane kontaktowe</h2>
              <div className="space-y-6">
                <a
                  href={phoneHref}
                  className="flex items-start gap-4 text-charcoal/80 hover:text-clay transition-colors group"
                >
                  <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-terracotta/10 transition-colors">
                    <Phone size={18} strokeWidth={1.5} className="text-clay" />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-clay mb-1">Telefon</p>
                    <p className="text-lg">{phone}</p>
                  </div>
                </a>

                <a
                  href={`mailto:${email}`}
                  className="flex items-start gap-4 text-charcoal/80 hover:text-clay transition-colors group"
                >
                  <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-terracotta/10 transition-colors">
                    <Mail size={18} strokeWidth={1.5} className="text-clay" />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-clay mb-1">E-mail</p>
                    <p className="text-lg">{email}</p>
                  </div>
                </a>

                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 text-charcoal/80 hover:text-clay transition-colors group"
                >
                  <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-terracotta/10 transition-colors">
                    <InstagramIcon size={18} className="text-clay" />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-clay mb-1">Instagram</p>
                    <p className="text-lg">{instagram}</p>
                  </div>
                </a>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} strokeWidth={1.5} className="text-clay" />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-clay mb-1">Lokalizacja</p>
                    <address className="not-italic text-charcoal/80 leading-relaxed text-sm">
                      Kleszczów, okolice Gliwic<br />
                      woj. śląskie
                    </address>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock size={18} strokeWidth={1.5} className="text-clay" />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-clay mb-1">Czas odpowiedzi</p>
                    <p className="text-charcoal/70 text-sm leading-relaxed">
                      Odpowiadam na wiadomości w ciągu 1–2 dni roboczych.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-8 bg-cream">
                <h3 className="font-serif text-xl text-espresso mb-4">Zamówienie indywidualne</h3>
                <p className="text-charcoal/70 text-sm leading-relaxed mb-6">
                  Tworzę ceramikę na zamówienie — zestawy ślubne, prezenty firmowe,
                  naczynia z personalizacją. Czas realizacji: 4+ tygodnie.
                </p>
                <a
                  href="/zamowienie-indywidualne"
                  className="inline-block text-xs tracking-widest uppercase text-clay border-b border-clay pb-0.5 hover:text-espresso hover:border-espresso transition-colors"
                >
                  Wypełnij formularz
                </a>
              </div>
            </div>

            {/* Formularz */}
            <div>
              <h2 className="font-serif text-2xl text-espresso mb-8">Napisz wiadomość</h2>
              <ContactForm workshopOptions={workshopOptions} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
