"use client";

import { Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import {
  bundleDiscountPercent,
  bundlePrice,
  bundleUnitPrice,
  type BundleConfig,
} from "@/lib/bundled-shipping";

/**
 * Cena produktu w teście „wysyłka w cenie” (zakładka Test w panelu).
 *
 * Dopóki koszyk jest pusty, produkt kosztuje `cena + wysyłka` i ma zieloną
 * etykietę „Darmowa wysyłka”. Gdy w koszyku jest już inna pozycja, wysyłka
 * jest opłacona – ten produkt pokazuje cenę bez narzutu, ze starą ceną
 * przekreśloną i informacją, ile to mniej.
 *
 * Zawartość koszyka czytamy przez `useCart`, dlatego komponent jest kliencki:
 * ta sama strona ISR pokazuje różne ceny różnym odwiedzającym.
 */
export default function ProductPriceTag({
  price,
  bundle,
  size = "md",
  className = "",
}: {
  /** Cena bazowa produktu z bazy (bez narzutu). */
  price: number;
  bundle: BundleConfig;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { items } = useCart();
  // Wysyłkę niesie pierwsza pozycja koszyka – jeśli coś już w nim jest,
  // ten produkt dokłada się bez narzutu
  const shippingCovered = items.length > 0;

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

  const unit = bundleUnitPrice(price, bundle, shippingCovered);
  const full = bundlePrice(price, bundle);
  const discount = bundleDiscountPercent(price, bundle);

  const badgeClass =
    size === "sm"
      ? "text-[9px] px-1 py-0.5 gap-1"
      : size === "lg"
        ? "text-xs px-2.5 py-1 gap-1.5"
        : "text-[10px] px-1.5 py-0.5 gap-1";
  const iconSize = size === "lg" ? 13 : size === "sm" ? 9 : 11;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {shippingCovered ? (
        <>
          <span className="text-charcoal/80 line-through decoration-charcoal/40">
            {format(full)}
          </span>
          <span>{format(unit)}</span>
          {discount > 0 && (
            <span
              className={`inline-flex items-center rounded-sm bg-green-50 text-green-700 ring-1 ring-green-200 tracking-wide uppercase ${badgeClass}`}
            >
              −{discount}%
            </span>
          )}
        </>
      ) : (
        <>
          <span>{format(unit)}</span>
          <span
            className={`inline-flex items-center rounded-sm bg-green-50 text-green-700 ring-1 ring-green-200 tracking-wide uppercase ${badgeClass}`}
          >
            <Truck size={iconSize} strokeWidth={1.75} aria-hidden="true" />
            Darmowa wysyłka
          </span>
        </>
      )}
    </span>
  );
}
