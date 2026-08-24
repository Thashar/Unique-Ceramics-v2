// Rozbicie kwot **złożonego zamówienia** – jedno dla strony potwierdzenia,
// historii zamówień klienta i karty zamówienia w panelu.
//
// Problem, który rozwiązuje: rabaty (produktowy, „Wielosztuki” i kod) siedzą
// już w cenach pozycji zapisanych w zamówieniu. Wcześniej każdy z tych widoków
// dokładał do podsumowania osobny wiersz „Kod rabatowy −X zł”, mimo że kwota
// była policzona w cenach – kolumna nie sumowała się do kwoty zapłaconej,
// dokładnie o wartość kodu. Tutaj liczymy jeden spójny zestaw wierszy, dla
// którego zawsze zachodzi:
//
//     produkty przed rabatem − rabat + wysyłka = razem
//
// Drugi powód: rozbicie odtwarzamy **z danych zapisanych w zamówieniu**
// (`OrderItem.basePrice`, `Order.bundleSurcharge`), a nie z bieżących ustawień
// sklepu. Dzięki temu wyłączenie promocji w panelu nie zmienia wyglądu
// zamówienia sprzed miesięcy.

import { bundleSummary, type BundleConfig } from "@/lib/bundled-shipping";
import { shownDiscountPercent } from "@/lib/product-price";

/** Kwoty są typu Float – każdy wynik zaokrąglamy do groszy (patrz CLAUDE.md). */
const money = (value: number): number => Math.round(value * 100) / 100;

export type OrderSummaryItem = {
  id: string;
  price: number;
  /** Cena katalogowa sprzed rabatu produktowego (null w zamówieniach sprzed zmiany). */
  basePrice?: number | null;
  quantity: number;
};

export type OrderSummaryInput = {
  items: OrderSummaryItem[];
  shippingCost: number;
  total: number;
  shippingMethod?: string | null;
  /** Narzut promocji „Wielosztuki” z chwili zakupu (null = promocja nie obowiązywała). */
  bundleSurcharge?: number | null;
  discountCode?: string | null;
  discountAmount?: number | null;
};

export type OrderSummaryLine = {
  id: string;
  /** Cena sztuki pokazywana klientowi (z narzutem, jeśli promocja obowiązywała). */
  unitPrice: number;
  lineTotal: number;
};

export type OrderSummaryView = {
  lines: OrderSummaryLine[];
  /** Czy promocja „Wielosztuki” obowiązywała przy tym zamówieniu. */
  bundleApplied: boolean;
  /** Wiersz „Produkty przed rabatem”. */
  catalogTotal: number;
  /** Łączny upust: rabat produktowy + „Wielosztuki” + kod. */
  discountTotal: number;
  discountPercent: number;
  /** Udział kodu w upuście – pokazywany jako dopisek, nie kolejne odjęcie. */
  codeAmount: number;
  codeLabel: string | null;
  /** Kwota w wierszu wysyłki (0 przy odbiorze osobistym i przy „Wielosztukach”). */
  shippingShown: number;
  /** Etykieta wiersza wysyłki. */
  shippingLabel: "pickup" | "bundled" | "free" | "paid";
  total: number;
};

export function orderSummary(order: OrderSummaryInput): OrderSummaryView {
  const surcharge =
    typeof order.bundleSurcharge === "number" && order.bundleSurcharge > 0
      ? order.bundleSurcharge
      : 0;
  const bundleApplied = surcharge > 0;

  // Pozycje pokazujemy tak, jak widział je klient: przy „Wielosztukach” z
  // narzutem rozłożonym na sztuki, a realnie zapłacony narzut to `shippingCost`
  // (przy odbiorze osobistym – zero, więc cały narzut wraca jako rabat)
  const cfg: BundleConfig = bundleApplied
    ? { enabled: true, surcharge, chargedSurcharge: order.shippingCost }
    : { enabled: false, surcharge: 0 };

  const summary = bundleSummary(
    order.items.map((i) => ({ ...i, basePrice: i.basePrice ?? undefined })),
    cfg
  );
  const lines: OrderSummaryLine[] = summary.lines.map((l) => ({
    id: l.item.id,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
  }));

  // Przy „Wielosztukach” wysyłka siedzi w cenach pozycji, więc wiersz wysyłki
  // nie dokłada do sumy nic – inaczej doliczylibyśmy narzut dwa razy
  const shippingShown = bundleApplied ? 0 : money(order.shippingCost);

  // Odniesienie: ceny katalogowe sprzed wszystkich rabatów. `basePrice` bywa
  // puste w starych zamówieniach – wtedy odniesieniem jest cena zapłacona
  const catalogTotal = money(
    order.items.reduce((sum, i) => {
      const list = typeof i.basePrice === "number" && i.basePrice > i.price ? i.basePrice : i.price;
      return sum + (list + surcharge) * i.quantity;
    }, 0)
  );

  // Jedyna definicja rabatu, która gwarantuje domknięcie kolumny
  const discountTotal = Math.max(0, money(catalogTotal + shippingShown - order.total));

  const codeAmount =
    typeof order.discountAmount === "number" && order.discountAmount > 0
      ? money(order.discountAmount)
      : 0;

  const shippingLabel: OrderSummaryView["shippingLabel"] =
    order.shippingMethod === "pickup"
      ? "pickup"
      : bundleApplied
        ? "bundled"
        : order.shippingCost === 0
          ? "free"
          : "paid";

  return {
    lines,
    bundleApplied,
    catalogTotal,
    discountTotal,
    discountPercent: shownDiscountPercent(catalogTotal, catalogTotal - discountTotal),
    codeAmount,
    codeLabel: order.discountCode || null,
    shippingShown,
    shippingLabel,
    total: money(order.total),
  };
}
