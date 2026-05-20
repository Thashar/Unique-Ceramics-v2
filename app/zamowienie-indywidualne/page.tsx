import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Zamówienie indywidualne",
  description: "Zamów ceramikę na zamówienie — zestawy ślubne, prezenty, personalizacja.",
};

export default function CustomOrderPage() {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-cream px-6 lg:px-10 py-20">
          <div className="max-w-7xl mx-auto max-w-2xl">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Na zamówienie</p>
            <h1 className="font-serif text-5xl text-espresso mb-6">Zamówienie indywidualne</h1>
            <p className="text-charcoal/70 leading-relaxed">
              Tworzę ceramikę na zamówienie — zestawy ślubne, prezenty firmowe,
              naczynia z personalizacją lub konkretne formy, których nie ma w sklepie.
              Czas realizacji wynosi zazwyczaj 4+ tygodnie od potwierdzenia projektu.
            </p>
          </div>
        </div>

        <div className="bg-warm-white py-20 px-6 lg:px-10">
          <div className="max-w-2xl mx-auto">
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Imię i nazwisko *</label>
                  <input type="text" required className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">E-mail *</label>
                  <input type="email" required className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Telefon</label>
                <input type="tel" className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Rodzaj zamówienia</label>
                <select className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm">
                  <option>Zestaw ślubny</option>
                  <option>Prezent firmowy</option>
                  <option>Personalizacja (imię, data)</option>
                  <option>Indywidualny projekt</option>
                  <option>Inne</option>
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Opis zamówienia *</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Opisz co chcesz zamówić — rodzaj przedmiotów, ilość, preferowane kolory, rozmiary, styl..."
                  className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Preferowany termin realizacji</label>
                <input type="date" className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Budżet (orientacyjnie)</label>
                <select className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm">
                  <option>Do 200 zł</option>
                  <option>200–500 zł</option>
                  <option>500–1000 zł</option>
                  <option>Powyżej 1000 zł</option>
                  <option>Nie wiem jeszcze</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-terracotta hover:bg-clay text-warm-white text-xs tracking-widest uppercase py-5 transition-colors"
              >
                Wyślij zapytanie
              </button>
            </form>

            <div className="mt-12 p-8 bg-cream text-sm text-charcoal/70 leading-relaxed space-y-2">
              <p className="font-medium text-espresso text-base mb-4">Co dalej?</p>
              <p>1. Przesłę odpowiedź w ciągu 2 dni roboczych.</p>
              <p>2. Omówimy szczegóły projektu i ustalimy wycenę.</p>
              <p>3. Po akceptacji rozpoczynam pracę po wpłacie zaliczki 50%.</p>
              <p>4. Czas realizacji: 4+ tygodnie od potwierdzenia.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
