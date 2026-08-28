import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Ostatni kafelek siatki produktów: zaproszenie do zamówień indywidualnych.
 *
 * Zastąpił pływający przycisk, który zasłaniał produkty i który dało się
 * schować na stałe. Kafelek stoi **na końcu każdej strony katalogu i każdej
 * kategorii** – także wtedy, gdy produktów jest więcej, niż mieści się na
 * jednej stronie, więc klient trafia na niego niezależnie od tego, gdzie
 * skończy przeglądanie.
 *
 * Wspomina o wysyłce zagranicznej, bo to tą drogą przyjmujemy takie
 * zamówienia (patrz `components/checkout/ForeignShippingNote.tsx`).
 *
 * `h-full` – siatka rozciąga elementy do wysokości wiersza, więc kafelek
 * zrównuje się z sąsiednimi kartami produktów.
 */
export default function CustomOrderTile({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/zamowienie-indywidualne"
      className="group flex h-full flex-col justify-between border border-clay/30 bg-cream hover:border-clay hover:bg-mist transition-colors duration-300 p-4 md:p-5"
    >
      <div>
        <p
          className={`flex items-center gap-1.5 tracking-widest uppercase text-clay ${
            compact ? "text-[9px] mb-1.5" : "text-[11px] mb-3"
          }`}
        >
          <Sparkles size={compact ? 11 : 13} strokeWidth={1.5} aria-hidden="true" />
          Zamówienia indywidualne
        </p>
        <h3
          className={`font-serif text-espresso leading-snug ${
            compact ? "text-sm mb-1.5" : "text-lg md:text-xl mb-3"
          }`}
        >
          Potrzebujesz ceramiki na zamówienie?
        </h3>
        <p
          className={`text-charcoal/80 leading-relaxed ${compact ? "text-[11px]" : "text-sm"}`}
        >
          Chcesz wcielić w życie swój projekt? A może zamówić z wysyłką do innego kraju?
          Zapraszam do sekcji zamówień indywidualnych.
        </p>
      </div>

      <span
        className={`inline-flex items-center gap-2 tracking-widest uppercase text-clay group-hover:text-espresso transition-colors ${
          compact ? "text-[9px] mt-3" : "text-xs mt-5"
        }`}
      >
        Napisz do mnie
        <ArrowRight
          size={compact ? 11 : 14}
          strokeWidth={1.5}
          className="group-hover:translate-x-1 transition-transform"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
