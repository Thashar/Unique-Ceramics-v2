// Promocja „Wielosztuki” – wysyłka wliczona w cenę produktu
// (zakładka Promocje w panelu admina).
//
// Zasada: w katalogu produkt kosztuje `cena + wysyłka` i ma etykietę „Darmowa
// wysyłka”. Wysyłkę płaci się raz, więc nadwyżkę z pozostałych sztuk oddajemy
// w koszyku jako rabat **proporcjonalny** – każda pozycja, także pierwsza,
// tanieje o ten sam procent. Suma zamówienia to zawsze `suma cen produktów + jedna wysyłka`,
// czyli dokładnie tyle, ile liczy serwer w `/api/checkout`. **To warstwa
// prezentacji – kwot po stronie serwera nie zmieniamy**, dzięki czemu promocja
// nie otwiera nowej drogi do manipulowania ceną zamówienia.
//
// Rabat produktowy (`Product.discountPercent`) siedzi już w cenie pozycji, więc
// oba upusty się sumują. Żeby klient je zobaczył **razem**, ceną odniesienia
// („przed rabatem”) jest cena katalogowa liczona z ceny **przed** rabatem
// produktowym – podaje ją pole `basePrice` pozycji. Bez niego (pozycje
// odtwarzane z zamówienia, które trzyma tylko kwoty do zapłaty) odniesieniem
// zostaje cena pozycji, czyli sam rabat za wielosztuki.
//
// Moduł jest neutralny (same funkcje) – używa go serwer i komponenty klienckie.

import { shownDiscountPercent } from "@/lib/product-price";

/** Klucz ustawienia włączającego promocję. */
export const BUNDLED_SHIPPING_KEY = "bundled_shipping_enabled";

export type BundleConfig = {
  enabled: boolean;
  /** Narzut = koszt wysyłki doliczany raz na zamówienie. */
  surcharge: number;
  /**
   * Ile z narzutu klient **realnie płaci** przy tym zamówieniu. Domyślnie tyle,
   * ile wynosi `surcharge`, ale przy odbiorze osobistym wysyłki nie ma, więc
   * cały narzut wraca do klienta jako rabat (`0`). Ceną odniesienia zostaje
   * `surcharge`, bo to ona siedzi w cenach katalogowych, które klient widział.
   */
  chargedSurcharge?: number;
};

/** Promocja wyłączona – ceny zachowują się jak dotąd. */
export const BUNDLE_OFF: BundleConfig = { enabled: false, surcharge: 0 };

/** Kwoty są typu Float – każdy wynik zaokrąglamy do groszy (patrz CLAUDE.md). */
const money = (value: number): number => Math.round(value * 100) / 100;

/**
 * Konfiguracja z ustawień sklepu. Narzut to **wyższy** z kosztów wysyłki
 * (kurier / paczkomat) – dzięki temu klient nigdy nie zapłaci przy kasie
 * więcej, niż zapowiadała cena w katalogu; tańsza metoda daje realny upust.
 */
export function bundleFromSettings(settings: {
  bundled_shipping_enabled?: string;
  shipping_cost?: string;
  shipping_cost_parcel_locker?: string;
}): BundleConfig {
  if (settings.bundled_shipping_enabled !== "true") return BUNDLE_OFF;
  const courier = Number(settings.shipping_cost) || 0;
  const parcel = Number(settings.shipping_cost_parcel_locker) || 0;
  const surcharge = money(Math.max(courier, parcel, 0));
  // Zerowy narzut oznaczałby promocję bez żadnego efektu – traktujemy jak wyłączoną
  return surcharge > 0 ? { enabled: true, surcharge } : BUNDLE_OFF;
}

/** Cena katalogowa: tyle kosztuje produkt, gdy klient nie ma nic w koszyku. */
export function bundlePrice(base: number, cfg: BundleConfig): number {
  return cfg.enabled ? money(base + cfg.surcharge) : money(base);
}

export type BundleLine<T> = {
  item: T;
  /** Cena sprzed rabatów (cena podstawowa + narzut) – od niej liczymy upust. */
  catalogUnitPrice: number;
  /** Cena sztuki po rabatach – rabat za wielosztuki dostaje **każda** sztuka, także pierwsza. */
  unitPrice: number;
  /** Upust na sztuce w procentach – policzony z dwóch kwot pokazywanych obok siebie. */
  discountPercent: number;
  /** Wartość pozycji po rabacie. */
  lineTotal: number;
};

export type BundleSummary<T> = {
  lines: BundleLine<T>[];
  /** Suma pozycji w cenach sprzed rabatów (produktowego i za wielosztuki). */
  catalogTotal: number;
  /** Łączny upust: rabaty produktowe + oddany narzut na wysyłkę. */
  discountTotal: number;
  /** Rabat wyrażony w procentach wartości katalogowej (0 = brak). */
  discountPercent: number;
  /** Suma cen produktów bez narzutu. */
  itemsTotal: number;
  /** Doliczona raz wysyłka (0 przy pustym koszyku albo wyłączonej promocji). */
  surcharge: number;
  /** Do zapłaty: `catalogTotal - discountTotal` = `itemsTotal + surcharge`. */
  total: number;
};

/**
 * Rozkłada koszyk na pozycje pokazywane klientowi.
 *
 * Wysyłkę płaci się raz, więc nadmiarowe narzuty wracają jako rabat – i to
 * rabat **na każdą sztukę, również pierwszą**. Rabat za wielosztuki jest
 * **proporcjonalny**: ceny pozycji mnożymy przez wspólny współczynnik
 * `total / promoTotal`, dzięki czemu narzut rozkłada się równo (podział kwotowy
 * `narzut / liczba sztuk` dawał tańszym produktom wyraźnie większy rabat
 * procentowy niż droższym).
 *
 * Ceną odniesienia jest natomiast cena **sprzed rabatu produktowego**
 * (`basePrice` + narzut), więc pokazany upust obejmuje oba rabaty naraz i zgadza
 * się z ceną przekreśloną na karcie produktu. Procent liczymy osobno dla każdej
 * pozycji – produkty mogą mieć różne rabaty własne, więc jedna wspólna wartość
 * kłamałaby na kartach.
 *
 * Suma pozycji po rabatach to nadal `ceny produktów + jedna wysyłka`, czyli
 * dokładnie tyle, ile policzy serwer; reszta z zaokrągleń ląduje na ostatniej
 * pozycji, żeby kwoty zgadzały się co do grosza.
 */
export function bundleSummary<
  T extends { price: number; quantity: number; basePrice?: number | null }
>(items: T[], cfg: BundleConfig): BundleSummary<T> {
  const itemsTotal = money(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const pieces = items.reduce((sum, i) => sum + i.quantity, 0);
  // Narzut realnie zapłacony – przy odbiorze osobistym 0, więc rabat obejmuje
  // cały narzut wliczony w ceny katalogowe
  const surcharge =
    cfg.enabled && pieces > 0 ? money(cfg.chargedSurcharge ?? cfg.surcharge) : 0;
  const total = money(itemsTotal + surcharge);

  /** Cena sprzed rabatu produktowego; brak `basePrice` = cena pozycji. */
  const listPrice = (item: T): number =>
    typeof item.basePrice === "number" && Number.isFinite(item.basePrice)
      ? Math.max(item.basePrice, item.price)
      : item.price;

  // Współczynnik rabatu za wielosztuki liczymy od cen **po** rabacie produktowym –
  // to on rozdziela sam narzut na wysyłkę, cudzego upustu nie rusza
  const promoTotal = money(
    items.reduce((sum, i) => sum + bundlePrice(i.price, cfg) * i.quantity, 0)
  );
  const ratio = cfg.enabled && promoTotal > 0 ? total / promoTotal : 1;

  // Odniesienie pokazywane klientowi: ceny sprzed obu rabatów
  const catalogTotal = money(
    items.reduce((sum, i) => sum + bundlePrice(listPrice(i), cfg) * i.quantity, 0)
  );
  const discountTotal = money(catalogTotal - total);
  const discountPercent = shownDiscountPercent(catalogTotal, total);

  const lines: BundleLine<T>[] = items.map((item) => {
    const catalogUnitPrice = bundlePrice(listPrice(item), cfg);
    const unitPrice = money(bundlePrice(item.price, cfg) * ratio);
    return {
      item,
      catalogUnitPrice,
      unitPrice,
      discountPercent: shownDiscountPercent(catalogUnitPrice, unitPrice),
      lineTotal: money(unitPrice * item.quantity),
    };
  });

  // Reszta z zaokrągleń trafia na ostatnią pozycję – suma musi się zgadzać
  // z kwotą liczoną przez serwer, nawet gdy narzut nie dzieli się równo
  const linesTotal = money(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const remainder = money(total - linesTotal);
  if (remainder !== 0 && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = { ...last, lineTotal: money(last.lineTotal + remainder) };
  }

  return {
    lines,
    catalogTotal,
    discountTotal,
    discountPercent,
    itemsTotal,
    surcharge,
    total,
  };
}
