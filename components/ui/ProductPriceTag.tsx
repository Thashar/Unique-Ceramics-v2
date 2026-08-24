import { BadgePercent, Truck } from "lucide-react";
import { discountedPrice, shownDiscountPercent } from "@/lib/product-price";

/**
 * Cena produktu – z rabatem produktowym i dopiskami o trwających promocjach.
 *
 * Cena w katalogu i na karcie produktu jest **zwykłą ceną** (po ewentualnej
 * przecenie). Rabat ilościowy zależy od zawartości koszyka, więc tu pokazujemy
 * go tylko jako zachętę – kwoty pojawiają się dopiero w koszyku, gdzie znana
 * jest liczba sztuk.
 *
 * Przeceniony produkt pokazuje cenę przekreśloną, cenę po rabacie i procent
 * **we wszystkich rozmiarach** – na karcie produktu (`size="lg"`) pełną
 * czcionką, w katalogu (`sm`/`md`) mniejszą.
 */
export default function ProductPriceTag({
  price,
  discountPercent = 0,
  quantityTeaser = null,
  freeShippingNote = false,
  size = "md",
  className = "",
}: {
  /** Cena bazowa produktu z bazy (przed rabatem produktowym). */
  price: number;
  /** Rabat produktowy w procentach (0 = brak przeceny). */
  discountPercent?: number;
  /** Zachęta do rabatu ilościowego, np. „Kup 3 szt. i zyskaj −10%”. */
  quantityTeaser?: string | null;
  /** Czy trwa promocja „Darmowa wysyłka” (dopisek w katalogu). */
  freeShippingNote?: boolean;
  /** `lg` = karta produktu, `md`/`sm` = kafelek listy (kompaktowy). */
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const format = (value: number) =>
    size === "lg"
      ? `${value.toFixed(2).replace(".", ",")} zł`
      : new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: "PLN",
          minimumFractionDigits: 0,
        }).format(value);

  const before = price;
  const after = discountedPrice(price, discountPercent);
  const percent = shownDiscountPercent(before, after);

  // Na karcie produktu zachęty stoją pod przyciskiem koszyka (QuantityPromoNotes),
  // więc przy cenie zostaje sama kwota
  if (size === "lg") {
    if (percent === 0) return <span className={className}>{format(after)}</span>;
    return (
      <span className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${className}`}>
        <span className="line-through decoration-charcoal/40 text-charcoal/80">
          {format(before)}
        </span>
        <span>{format(after)}</span>
        <span className="text-green-700 text-base">−{percent}%</span>
      </span>
    );
  }

  // W katalogu przecena też musi być widoczna – kafelek pokazujący samą obniżoną
  // cenę nie dawał klientowi szansy zauważyć promocji
  const priceLine =
    percent > 0 ? (
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="line-through decoration-charcoal/40 text-charcoal/80">
          {format(before)}
        </span>
        <span>{format(after)}</span>
        <span className={`text-green-700 ${size === "sm" ? "text-[9px]" : "text-[10px]"}`}>
          −{percent}%
        </span>
      </span>
    ) : (
      <span>{format(after)}</span>
    );

  if (!quantityTeaser && !freeShippingNote) {
    return <span className={className}>{priceLine}</span>;
  }

  const noteClass = size === "sm" ? "text-[9px] gap-1" : "text-[10px] gap-1";
  const iconClass = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span className={`flex flex-col gap-1 ${className}`}>
      {priceLine}
      <span className={`flex flex-wrap items-center text-green-700 ${noteClass}`}>
        {freeShippingNote && (
          <span className="inline-flex items-center gap-1">
            <Truck className={iconClass} strokeWidth={1.75} aria-hidden="true" />
            Darmowa wysyłka
          </span>
        )}
        {quantityTeaser && (
          <span className="inline-flex items-center gap-1">
            <BadgePercent className={iconClass} strokeWidth={1.75} aria-hidden="true" />
            {quantityTeaser}
          </span>
        )}
      </span>
    </span>
  );
}
