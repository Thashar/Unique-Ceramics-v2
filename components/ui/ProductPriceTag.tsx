import { Truck, BadgePercent } from "lucide-react";
import { bundlePrice, type BundleConfig } from "@/lib/bundled-shipping";
import { discountedPrice, shownDiscountPercent } from "@/lib/product-price";

/**
 * Cena produktu – z rabatem produktowym i promocją „Wielosztuki”.
 *
 * Rabat produktowy schodzi z ceny bazowej, dopiero potem dochodzi narzut na
 * wysyłkę, więc obie promocje się sumują. Przeceniony produkt pokazuje na
 * **karcie produktu** (`size="lg"`) cenę przekreśloną, cenę po rabacie i
 * procent policzony **z tych dwóch kwot** (przy narzucie realna obniżka jest
 * niższa niż nominalny rabat – liczby na stronie muszą się zgadzać).
 *
 * W katalogu (`sm`/`md`) przeceniony produkt też pokazuje cenę przekreśloną
 * i procent – tyle że mniejszą czcionką – plus zielone dopiski „Darmowa wysyłka”
 * i „Uzyskaj rabat”; kwoty rabatu koszykowego widać dopiero w koszyku.
 */
export default function ProductPriceTag({
  price,
  bundle,
  discountPercent = 0,
  size = "md",
  className = "",
}: {
  /** Cena bazowa produktu z bazy (przed rabatem i bez narzutu na wysyłkę). */
  price: number;
  bundle: BundleConfig;
  /** Rabat produktowy w procentach (0 = brak przeceny). */
  discountPercent?: number;
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

  // Obie kwoty niosą ten sam narzut promocji „Wielosztuki” – porównujemy to,
  // co klient realnie widzi
  const before = bundlePrice(price, bundle);
  const after = bundlePrice(discountedPrice(price, discountPercent), bundle);
  const percent = shownDiscountPercent(before, after);

  // Na karcie produktu dopiski o wysyłce i rabacie koszykowym stoją pod
  // przyciskiem koszyka (ProductBundleNotes), więc przy cenie zostaje sama kwota
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

  // W katalogu przecena też musi być widoczna – wcześniej kafelek pokazywał samą
  // obniżoną cenę, więc klient przeglądający listę nie miał jak zauważyć promocji
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

  if (!bundle.enabled) return <span className={className}>{priceLine}</span>;

  const noteClass = size === "sm" ? "text-[9px] gap-1" : "text-[10px] gap-1";
  const iconClass = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span className={`flex flex-col gap-1 ${className}`}>
      {priceLine}
      <span className={`flex flex-wrap items-center text-green-700 ${noteClass}`}>
        <span className="inline-flex items-center gap-1">
          <Truck className={iconClass} strokeWidth={1.75} aria-hidden="true" />
          Darmowa wysyłka
        </span>
        <span className="inline-flex items-center gap-1">
          <BadgePercent className={iconClass} strokeWidth={1.75} aria-hidden="true" />
          Uzyskaj rabat
        </span>
      </span>
    </span>
  );
}
