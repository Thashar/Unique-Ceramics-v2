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
// Moduł jest neutralny (same funkcje) – używa go serwer i komponenty klienckie.

/** Klucz ustawienia włączającego promocję. */
export const BUNDLED_SHIPPING_KEY = "bundled_shipping_enabled";

export type BundleConfig = {
  enabled: boolean;
  /** Narzut = koszt wysyłki doliczany raz na zamówienie. */
  surcharge: number;
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
  /** Cena katalogowa sztuki (baza + narzut) – ta sama, którą klient widział w sklepie. */
  catalogUnitPrice: number;
  /** Cena sztuki po rabacie – rabat dostaje **każda** sztuka, także pierwsza. */
  unitPrice: number;
  /** Rabat na sztuce w procentach – ten sam dla wszystkich pozycji w koszyku. */
  discountPercent: number;
  /** Wartość pozycji po rabacie. */
  lineTotal: number;
};

export type BundleSummary<T> = {
  lines: BundleLine<T>[];
  /** Suma pozycji po cenach katalogowych (przed rabatem). */
  catalogTotal: number;
  /** Łączny rabat rozdzielony proporcjonalnie na wszystkie pozycje koszyka. */
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
 * rabat **na każdą sztukę, również pierwszą**. Rabat jest **proporcjonalny**:
 * ceny katalogowe mnożymy przez wspólny współczynnik `total / catalogTotal`,
 * dzięki czemu każda pozycja tanieje o ten sam procent (podział kwotowy
 * `narzut / liczba sztuk` dawał tańszym produktom wyraźnie większy rabat
 * procentowy niż droższym). Suma pozycji po rabacie to nadal `ceny produktów +
 * jedna wysyłka`, czyli dokładnie tyle, ile policzy serwer; reszta z zaokrągleń
 * ląduje na ostatniej pozycji, żeby kwoty zgadzały się co do grosza.
 */
export function bundleSummary<T extends { price: number; quantity: number }>(
  items: T[],
  cfg: BundleConfig
): BundleSummary<T> {
  const itemsTotal = money(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const pieces = items.reduce((sum, i) => sum + i.quantity, 0);
  const surcharge = cfg.enabled && pieces > 0 ? cfg.surcharge : 0;
  const total = money(itemsTotal + surcharge);

  const catalogTotal = money(
    items.reduce((sum, i) => sum + bundlePrice(i.price, cfg) * i.quantity, 0)
  );
  const discountTotal = money(catalogTotal - total);
  // Jeden współczynnik dla całego koszyka = ten sam % rabatu na każdej pozycji
  const ratio = cfg.enabled && catalogTotal > 0 ? total / catalogTotal : 1;
  const discountPercent =
    catalogTotal > 0 && discountTotal > 0
      ? Math.round((discountTotal / catalogTotal) * 100)
      : 0;

  const lines: BundleLine<T>[] = items.map((item) => {
    const catalogUnitPrice = bundlePrice(item.price, cfg);
    const unitPrice = money(catalogUnitPrice * ratio);
    return {
      item,
      catalogUnitPrice,
      unitPrice,
      // Procent bierzemy wspólny, a nie liczony z zaokrąglonej ceny sztuki –
      // inaczej grosz zaokrąglenia rozjeżdżałby etykiety między pozycjami
      discountPercent: catalogUnitPrice > unitPrice ? discountPercent : 0,
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
