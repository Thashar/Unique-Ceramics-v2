import { Globe, Package, Palette } from "lucide-react";

/**
 * Trzy rzeczy, które klient powinien wiedzieć o zamówieniach indywidualnych.
 * Jedno źródło dla wszystkich miejsc, w których je wypisujemy – pasa na końcu
 * katalogu (`app/sklep/CustomOrderTile.tsx`) i bloku na `/kontakt`.
 */
export const CUSTOM_ORDER_POINTS = [
  { icon: Palette, label: "Zrealizuję Twój projekt" },
  { icon: Package, label: "Pojedyncza sztuka lub komplet" },
  { icon: Globe, label: "Wysyłka także za granicę" },
];

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
}: {
  inline?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={`flex flex-col gap-2 ${
        inline ? "md:flex-row md:flex-wrap md:gap-x-6 md:gap-y-2" : ""
      } ${className}`}
    >
      {CUSTOM_ORDER_POINTS.map(({ icon: Icon, label }) => (
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
