"use client";

import { Truck, BadgePercent } from "lucide-react";
import { useCart } from "@/lib/cart";
import type { BundleConfig } from "@/lib/bundled-shipping";

/**
 * Informacje o promocji „Wielosztuki” na karcie produktu – w bloku pod
 * przyciskiem koszyka, razem z czasem realizacji. Przy cenie ich nie
 * powtarzamy, żeby liczba nie ginęła w dopiskach.
 *
 * Zachęta zależy od koszyka: pusty – podpowiadamy dołożenie kolejnej sztuki,
 * niepusty – że ten produkt dołoży się z rabatem. Dlatego komponent jest
 * kliencki; sama cena zostaje renderowana na serwerze.
 */
export default function ProductBundleNotes({ bundle }: { bundle: BundleConfig }) {
  const { items } = useCart();
  if (!bundle.enabled) return null;

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-green-700">
        <Truck size={14} strokeWidth={1.5} className="shrink-0" />
        <span>Darmowa wysyłka</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-green-700">
        <BadgePercent size={14} strokeWidth={1.5} className="shrink-0" />
        <span>
          {items.length > 0
            ? "Dodaj produkt do koszyka, aby uzyskać dodatkowy rabat"
            : "Dodaj drugą sztukę lub więcej, by otrzymać rabat"}
        </span>
      </div>
    </>
  );
}
