"use client";

import { BadgePercent, Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { priceOrder } from "@/lib/discount-code";
import {
  nextTierHintText,
  quantityPromoTeaser,
  type QuantityPromoConfig,
} from "@/lib/quantity-promo";
import type { FreeShippingConfig } from "@/lib/free-shipping";

/**
 * Informacje o trwających promocjach na karcie produktu – w bloku pod
 * przyciskiem koszyka, razem z czasem realizacji. Przy cenie ich nie
 * powtarzamy, żeby liczba nie ginęła w dopiskach.
 *
 * Zachęta zależy od koszyka: pusty – pokazujemy najniższy próg promocji,
 * niepusty – ile **realnie** brakuje do kolejnego progu. Dlatego komponent jest
 * kliencki; sama cena zostaje renderowana na serwerze.
 */
export default function QuantityPromoNotes({
  quantityPromo,
  freeShipping,
}: {
  quantityPromo: QuantityPromoConfig | null;
  freeShipping: FreeShippingConfig | null;
}) {
  const { items } = useCart();

  if (!quantityPromo && !freeShipping) return null;

  // Podpowiedź liczymy tą samą funkcją co koszyk – jeśli klient ma już coś
  // w koszyku, mówimy mu dokładnie, ile brakuje, zamiast ogólnej zachęty.
  // Wysyłka jest tu nieistotna (interesuje nas tylko próg rabatu), więc
  // podajemy zerowe stawki i brak promocji wysyłkowej.
  const hint =
    items.length > 0 && quantityPromo
      ? nextTierHintText(
          priceOrder({
            items,
            quantityPromo,
            code: null,
            shipping: {
              method: "pickup",
              courier: 0,
              parcelLocker: 0,
              freeShipping: null,
            },
          }).quantityNextTier
        )
      : null;

  const teaser = hint ?? quantityPromoTeaser(quantityPromo);

  return (
    <>
      {freeShipping && (
        <div className="flex items-center gap-3 text-xs text-green-700">
          <Truck size={14} strokeWidth={1.5} className="shrink-0" />
          <span>
            {freeShipping.minOrderValue > 0
              ? `Darmowa wysyłka od ${freeShipping.minOrderValue.toFixed(2).replace(".", ",")} zł`
              : "Darmowa wysyłka"}
          </span>
        </div>
      )}
      {teaser && (
        <div className="flex items-center gap-3 text-xs text-green-700">
          <BadgePercent size={14} strokeWidth={1.5} className="shrink-0" />
          <span>{teaser}</span>
        </div>
      )}
    </>
  );
}
