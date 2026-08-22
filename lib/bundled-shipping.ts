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
  catalogUnitPrice: number;
  /** Cena sztuki po rabacie – rabat dostaje **każda** sztuka, także pierwsza. */
  unitPrice: number;
  /** Rabat na sztuce w procentach ceny katalogowej. */
  discountPercent: number;
  /** Wartość pozycji po rabacie. */
  lineTotal: number;
};

export type BundleSummary<T> = {
  lines: BundleLine<T>[];
  /** Suma pozycji po cenach katalogowych (przed rabatem). */
  catalogTotal: number;
  /** Łączny rabat rozdzielony po równo na wszystkie sztuki w koszyku. */
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
 * rabat **na każdą sztukę, również pierwszą**: po podziale każda sztuka niesie
 * `narzut / liczba sztuk` zamiast pełnego narzutu. Suma pozycji po rabacie to
 * nadal `ceny produktów + jedna wysyłka`, czyli dokładnie tyle, ile policzy
 * serwer; ewentualna reszta z dzielenia (np. 18 zł na 7 sztuk) ląduje na
 * ostatniej pozycji, żeby kwoty zgadzały się co do grosza.
 */
export function bundleSummary<T extends { price: number; quantity: number }>(
  items: T[],
  cfg: BundleConfig
): BundleSummary<T> {
  const itemsTotal = money(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const pieces = items.reduce((sum, i) => sum + i.quantity, 0);
  const surcharge = cfg.enabled && pieces > 0 ? cfg.surcharge : 0;
  const total = money(itemsTotal + surcharge);

  // Ile z wysyłki przypada na jedną sztukę po rozłożeniu jej na cały koszyk
  const surchargePerPiece = cfg.enabled && pieces > 0 ? cfg.surcharge / pieces : 0;

  const lines: BundleLine<T>[] = items.map((item) => {
    const catalogUnitPrice = bundlePrice(item.price, cfg);
    const unitPrice = cfg.enabled ? money(item.price + surchargePerPiece) : money(item.price);
    return {
      item,
      catalogUnitPrice,
      unitPrice,
      discountPercent:
        catalogUnitPrice > unitPrice
          ? Math.round(((catalogUnitPrice - unitPrice) / catalogUnitPrice) * 100)
          : 0,
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

  const catalogTotal = money(lines.reduce((sum, l) => sum + l.catalogUnitPrice * l.item.quantity, 0));
  const discountTotal = money(catalogTotal - total);

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
