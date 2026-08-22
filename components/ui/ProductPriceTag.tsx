import { Truck, BadgePercent } from "lucide-react";
import { bundlePrice, type BundleConfig } from "@/lib/bundled-shipping";

/**
 * Cena produktu w promocji „Wielosztuki”.
 *
 * W katalogu pod ceną stoją zielone dopiski „Darmowa wysyłka” i „Uzyskaj
 * rabat”. Na karcie produktu (`size="lg"`) zostaje sama cena – tam te same
 * informacje pokazuje `ProductBundleNotes` w bloku pod przyciskiem koszyka.
 * Cena jest zawsze katalogowa; kwoty rabatu widać dopiero w koszyku.
 */
export default function ProductPriceTag({
  price,
  bundle,
  size = "md",
  className = "",
}: {
  /** Cena bazowa produktu z bazy (bez narzutu na wysyłkę). */
  price: number;
  bundle: BundleConfig;
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

  // Na karcie produktu dopiski stoją pod przyciskiem koszyka (ProductBundleNotes),
  // więc przy cenie zostaje sama kwota
  if (!bundle.enabled || size === "lg") {
    return <span className={className}>{format(bundlePrice(price, bundle))}</span>;
  }

  const noteClass = size === "sm" ? "text-[9px] gap-1" : "text-[10px] gap-1";
  const iconClass = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span className={`flex flex-col gap-1 ${className}`}>
      <span>{format(bundlePrice(price, bundle))}</span>
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
