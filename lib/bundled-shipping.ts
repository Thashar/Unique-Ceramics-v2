// Test cenowy „wysyłka w cenie produktu” (zakładka Test w panelu admina).
//
// Zasada: dopóki koszyk jest pusty, produkt kosztuje `cena + wysyłka` i ma
// etykietę „Darmowa wysyłka”. Wysyłkę płaci się raz – pierwsza pozycja
// w koszyku niesie narzut, każda kolejna jest już bez niego. Suma zamówienia
// to zawsze `suma cen produktów + jedna wysyłka`, czyli dokładnie tyle, ile
// liczy serwer w `/api/checkout`. **To warstwa prezentacji – kwot po stronie
// serwera nie zmieniamy**, dzięki czemu test nie otwiera nowej drogi do
// manipulowania ceną zamówienia.
//
// Moduł jest neutralny (same funkcje) – używa go serwer i komponenty klienckie.

/** Klucz ustawienia włączającego test. */
export const BUNDLED_SHIPPING_KEY = "bundled_shipping_enabled";

export type BundleConfig = {
  enabled: boolean;
  /** Narzut = koszt wysyłki doliczany raz na zamówienie. */
  surcharge: number;
};

/** Test wyłączony – ceny zachowują się jak dotąd. */
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
  // Zerowy narzut oznaczałby test bez żadnego efektu – traktujemy jak wyłączony
  return surcharge > 0 ? { enabled: true, surcharge } : BUNDLE_OFF;
}

/** Cena katalogowa: tyle kosztuje produkt, gdy klient nie ma nic w koszyku. */
export function bundlePrice(base: number, cfg: BundleConfig): number {
  return cfg.enabled ? money(base + cfg.surcharge) : money(base);
}

/**
 * Cena, jaką klient realnie zapłaci za sztukę.
 * `shippingCovered` = w koszyku jest już inna pozycja, która niesie wysyłkę.
 */
export function bundleUnitPrice(
  base: number,
  cfg: BundleConfig,
  shippingCovered: boolean
): number {
  return cfg.enabled && !shippingCovered ? money(base + cfg.surcharge) : money(base);
}

/** O ile procent taniej wypada produkt, gdy wysyłkę pokrywa inna pozycja. */
export function bundleDiscountPercent(base: number, cfg: BundleConfig): number {
  const full = bundlePrice(base, cfg);
  if (!cfg.enabled || full <= 0) return 0;
  return Math.round((cfg.surcharge / full) * 100);
}

export type BundleLine<T> = {
  item: T;
  /** Cena katalogowa sztuki (baza + narzut) – ta sama, którą klient widział w sklepie. */
  unitPrice: number;
  /** Wartość pozycji po cenach katalogowych. */
  lineTotal: number;
};

export type BundleSummary<T> = {
  lines: BundleLine<T>[];
  /** Suma pozycji po cenach katalogowych (z narzutem w każdej sztuce). */
  catalogTotal: number;
  /**
   * Rabat naliczany **na cały koszyk**: wysyłkę płaci się raz, więc nadmiarowe
   * narzuty z pozostałych sztuk wracają do klienta jako jedna kwota. Pozycje
   * zostają przy cenach katalogowych – dzięki temu klient widzi jeden rabat,
   * a nie osobny przy każdym produkcie.
   */
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
 * Rozkłada koszyk na pozycje pokazywane klientowi: każda po cenie katalogowej,
 * a cała oszczędność wychodzi jednym wierszem rabatu w podsumowaniu.
 */
export function bundleSummary<T extends { price: number; quantity: number }>(
  items: T[],
  cfg: BundleConfig
): BundleSummary<T> {
  const itemsTotal = money(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const pieces = items.reduce((sum, i) => sum + i.quantity, 0);
  const surcharge = cfg.enabled && pieces > 0 ? cfg.surcharge : 0;

  const lines = items.map((item) => ({
    item,
    unitPrice: bundlePrice(item.price, cfg),
    lineTotal: money(bundlePrice(item.price, cfg) * item.quantity),
  }));

  const catalogTotal = money(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  // Narzut zapłacony w każdej sztuce minus ta jedna wysyłka, którą klient
  // realnie ponosi – reszta wraca jako rabat na koszyk
  const discountTotal = cfg.enabled && pieces > 1 ? money((pieces - 1) * cfg.surcharge) : 0;
  const total = money(itemsTotal + surcharge);

  return {
    lines,
    catalogTotal,
    discountTotal,
    discountPercent:
      catalogTotal > 0 && discountTotal > 0
        ? Math.round((discountTotal / catalogTotal) * 100)
        : 0,
    itemsTotal,
    surcharge,
    total,
  };
}
