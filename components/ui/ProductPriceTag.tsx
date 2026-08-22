"use client";

import { Truck, BadgePercent } from "lucide-react";
import { useCart } from "@/lib/cart";
import { bundlePrice, type BundleConfig } from "@/lib/bundled-shipping";

/**
 * Cena produktu w teście „wysyłka w cenie”.
 *
 * W katalogu i na karcie produktu pokazujemy **zawsze tę samą cenę** – bez
 * przekreśleń i przeliczeń. Zachęta „Uzyskaj rabat” dochodzi dopiero wtedy,
 * gdy w koszyku jest już jakaś pozycja: wysyłka jest wówczas opłacona, więc ten
 * produkt realnie dołoży się taniej. Sam rabat klient zobaczy w koszyku, gdzie
 * kwoty są liczone naprawdę.
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
  const { items } = useCart();
  // Rabat przysługuje dopiero, gdy wysyłkę pokrywa inna pozycja koszyka
  const discountAvailable = items.length > 0;

  const format = (value: number) =>
    size === "lg"
      ? `${value.toFixed(2).replace(".", ",")} zł`
      : new Intl.NumberFormat("pl-PL", {
          style: "currency",
          currency: "PLN",
          minimumFractionDigits: 0,
        }).format(value);

  if (!bundle.enabled) {
    return <span className={className}>{format(price)}</span>;
  }

  const noteClass =
    size === "sm" ? "text-[9px] gap-1" : size === "lg" ? "text-xs gap-1.5" : "text-[10px] gap-1";
  const iconClass = size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3";

  return (
    <span className={`flex flex-col gap-1 ${className}`}>
      <span>{format(bundlePrice(price, bundle))}</span>
      {/* font-sans: na karcie produktu cena jest w serifie, a te dopiski mają
          wyglądać jak reszta drobnych informacji */}
      <span className={`flex flex-wrap items-center font-sans font-normal text-green-700 ${noteClass}`}>
        <span className="inline-flex items-center gap-1">
          <Truck className={iconClass} strokeWidth={1.75} aria-hidden="true" />
          Darmowa wysyłka
        </span>
        {discountAvailable && (
          <span className="inline-flex items-center gap-1">
            <BadgePercent className={iconClass} strokeWidth={1.75} aria-hidden="true" />
            {size === "lg" ? "Dodaj produkt do koszyka, aby uzyskać rabat" : "Uzyskaj rabat"}
          </span>
        )}
      </span>
    </span>
  );
}
