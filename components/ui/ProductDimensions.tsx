import { Diameter, Droplet, MoveHorizontal, MoveVertical, Ruler, type LucideIcon } from "lucide-react";
import type { DimensionId, DimensionRow } from "@/lib/product-dimensions";

/**
 * Wymiary na karcie produktu – **wiersz na wymiar, z ikoną po lewej**
 * (decyzja właściciela 19.09.2026). Do tego dnia wymiary istniały wyłącznie
 * jako akapit w opisie, więc wpisane w panelu pola nie pokazywały się nigdzie.
 *
 * Wiersz powstaje **tylko z wypełnionej wartości** – produkt z samą pojemnością
 * pokazuje samą pojemność, bez pustej wysokości. Puste `rows` nie renderują nic.
 *
 * Ikona idzie z `id` wymiaru; `Record<DimensionId, …>` sprawia, że dołożenie
 * wymiaru do `DIMENSION_FIELDS` bez ikony **nie skompiluje się**.
 */
const ICONS: Record<DimensionId, LucideIcon> = {
  wysokosc: MoveVertical,
  szerokosc: MoveHorizontal,
  dlugosc: Ruler,
  "srednica-gorna": Diameter,
  pojemnosc: Droplet,
};

/** Etykieta wielką literą – w bazie i w opisach trzymamy ją małą. */
function heading(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ProductDimensions({ rows }: { rows: DimensionRow[] }) {
  if (rows.length === 0) return null;

  return (
    <ul className="mb-6 space-y-2">
      {rows.map((row, i) => {
        // Wiersz odczytany ze starego opisu bywa bez rozpoznanego wymiaru –
        // dostaje wtedy ikonę ogólną, zamiast wypaść z listy
        const Icon = row.id ? ICONS[row.id] : Ruler;
        return (
          <li key={`${row.id ?? row.label}-${i}`} className="flex items-center gap-2.5 text-sm text-charcoal/80">
            <Icon size={18} strokeWidth={1.5} className="shrink-0 text-clay" aria-hidden="true" />
            <span>
              <span className="text-espresso">{heading(row.label)}:</span> {row.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
