import { Globe, Package, Palette } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";

/**
 * Trzy rzeczy, które klient powinien wiedzieć o zamówieniach indywidualnych.
 * Jedno źródło dla wszystkich miejsc, w których je wypisujemy – pasa na końcu
 * katalogu (`app/sklep/CustomOrderTile.tsx`) i bloku na `/kontakt`.
 */
const POINT_ICONS = [Palette, Package, Globe];

/** Hasła w danym języku – treść w `lib/dictionary.ts` (`shop.customPoints`). */
export function customOrderPoints(locale: Locale) {
  return t(locale).shop.customPoints.map((label, i) => ({ icon: POINT_ICONS[i] ?? Palette, label }));
}

/**
 * Lista haseł z ikonami, na ciemnym tle (`espresso`).
 *
 * `inline` układa je w rząd od `md` w górę – tak wygląda pas w katalogu, gdzie
 * jest na to szerokość. Bez tego propa hasła stoją jedno pod drugim, co pasuje
 * do wąskiej kolumny na `/kontakt`. Na telefonie zawsze idą w kolumnie: obok
 * siebie łamały się w poszarpaną siatkę.
 */
export default function CustomOrderPoints({
  inline = false,
  className = "",
  locale = "pl",
}: {
  inline?: boolean;
  className?: string;
  locale?: Locale;
}) {
  return (
    <ul
      className={`flex flex-col gap-2 ${
        inline ? "md:flex-row md:flex-wrap md:gap-x-6 md:gap-y-2" : ""
      } ${className}`}
    >
      {customOrderPoints(locale).map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-2 text-sand/90 text-[12px] sm:text-[13px]"
        >
          <Icon size={14} strokeWidth={1.5} className="text-terracotta shrink-0" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
