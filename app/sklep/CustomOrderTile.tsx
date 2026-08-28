import Link from "next/link";
import { ArrowRight, Gift, Globe, Package, Palette } from "lucide-react";

/** Trzy powody z tekstu zaproszenia, każdy z własną ikoną. */
const POINTS = [
  { icon: Palette, label: "Zrealizuję Twój projekt" },
  { icon: Package, label: "Pojedyncza sztuka lub komplet" },
  { icon: Globe, label: "Wysyłka także za granicę" },
];

/**
 * Zaproszenie do zamówień indywidualnych na końcu siatki produktów.
 *
 * **Zajmuje cały wiersz (`col-span-full`), a nie jedno pole siatki.** Dwie
 * wcześniejsze wersje udawały kartę produktu i obie wyszły źle: w katalogu na
 * telefonie kafelki mają około 110 px szerokości, więc tekst łamał się co dwa
 * słowa i powstawał wąski słupek liter, a wśród zdjęć produktów sam blok tekstu
 * odstawał od reszty. Pas przez całą szerokość czyta się jak domknięcie listy,
 * ma miejsce na treść w każdej rozdzielczości i nie konkuruje z kafelkami.
 *
 * **Linkiem jest wyłącznie przycisk, nie cały pas** (decyzja właściciela
 * 28.08.2026). Wcześniej klikalna była cała ramka – przypadkowe kliknięcie
 * w tekst wyrzucało z katalogu, a nagłówka nie dało się nawet zaznaczyć.
 *
 * **Układ zmienia się raz, na `md` (768 px):**
 * - poniżej (telefony 360–430 px, małe tablety) wszystko idzie w kolumnie,
 *   trzy hasła stoją **jedno pod drugim**, a przycisk jest na pełną szerokość –
 *   na wąskim ekranie łatwiej w niego trafić;
 * - od `md` w górę ikona, tekst i przycisk stoją w rzędzie, a hasła obok siebie.
 *   Świadomie **nie na `sm`**: przy 640–767 px rząd z nagłówkiem, trzema
 *   hasłami i przyciskiem robił się ciasny.
 *
 * Rozmiary tekstu i odstępy rosną stopniowo (`sm`, `md`), więc pas wygląda
 * tak samo dobrze na 360 px i na 1920 px. Tekst może się zwężać (`min-w-0`),
 * przycisk nie (`shrink-0`).
 *
 * Ciemne tło (`espresso`) to ten sam materiał co stopka i sekcje strony
 * głównej – element jest wyraźny, ale zostaje w palecie sklepu.
 *
 * Zastąpił pływający przycisk, który zasłaniał produkty i dało się go schować
 * na stałe. Stoi na końcu **każdej strony** katalogu i każdej kategorii.
 */
export default function CustomOrderTile() {
  return (
    <div className="col-span-full flex flex-col md:flex-row md:items-center gap-5 md:gap-7 bg-espresso p-5 sm:p-7 md:p-8">
      <span
        className="inline-flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-full border border-terracotta/40 bg-terracotta/10 text-terracotta shrink-0"
        aria-hidden="true"
      >
        <Gift strokeWidth={1.5} className="w-5 h-5 md:w-6 md:h-6" />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-[11px] tracking-widest uppercase text-terracotta mb-1.5 sm:mb-2">
          Zamówienia indywidualne
        </p>
        <h3 className="font-serif text-lg sm:text-xl md:text-2xl text-cream leading-snug">
          Potrzebujesz ceramiki na zamówienie?
        </h3>
        {/* Trzy hasła zamiast akapitu – to samo, co niosło zdanie, ale czytelne
            jednym rzutem oka. Na telefonie jedno pod drugim: obok siebie łamały
            się w poszarpaną siatkę */}
        <ul className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-x-6 md:gap-y-2 mt-3 sm:mt-4">
          {POINTS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 text-sand/90 text-[12px] sm:text-[13px]"
            >
              <Icon size={14} strokeWidth={1.5} className="text-terracotta shrink-0" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/zamowienie-indywidualne"
        className="group w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-3 border border-terracotta/50 hover:border-terracotta hover:bg-terracotta hover:text-espresso text-cream text-[11px] sm:text-xs tracking-widest uppercase px-5 sm:px-6 py-3 sm:py-3.5 transition-all duration-300"
      >
        Napisz do mnie
        <ArrowRight
          size={14}
          strokeWidth={1.5}
          className="group-hover:translate-x-1 transition-transform"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
