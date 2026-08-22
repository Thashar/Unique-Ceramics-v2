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
  /** Cena jednostkowa pokazywana klientowi (pierwsza pozycja niesie wysyłkę). */
  unitPrice: number;
  /** Cena przekreślona – tylko dla pozycji, które straciły narzut. */
  wasPrice: number | null;
  /** Rabat w procentach (0 = brak). */
  discountPercent: number;
  /** Wartość pozycji: `unitPrice` × pierwsza sztuka + cena bazowa × reszta. */
  lineTotal: number;
};

export type BundleSummary<T> = {
  lines: BundleLine<T>[];
  /** Suma cen produktów bez narzutu. */
  itemsTotal: number;
  /** Doliczona raz wysyłka (0 przy pustym koszyku albo wyłączonym teście). */
  surcharge: number;
  /** Do zapłaty: `itemsTotal + surcharge` – tyle samo policzy serwer. */
  total: number;
};

/**
 * Rozkłada koszyk na pozycje z cenami pokazywanymi klientowi.
 * Narzut niesie **pierwsza sztuka pierwszej pozycji** – kolejne sztuki tego
 * samego produktu też są już bez wysyłki.
 */
export function bundleSummary<T extends { price: number; quantity: number }>(
  items: T[],
  cfg: BundleConfig
): BundleSummary<T> {
  const itemsTotal = money(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const surcharge = cfg.enabled && items.length > 0 ? cfg.surcharge : 0;

  let surchargeUsed = false;
  const lines = items.map((item) => {
    const carriesShipping = cfg.enabled && !surchargeUsed;
    if (carriesShipping) surchargeUsed = true;

    const unitPrice = carriesShipping ? money(item.price + cfg.surcharge) : money(item.price);
    return {
      item,
      unitPrice,
      wasPrice: cfg.enabled && !carriesShipping ? bundlePrice(item.price, cfg) : null,
      discountPercent: cfg.enabled && !carriesShipping ? bundleDiscountPercent(item.price, cfg) : 0,
      lineTotal: money(item.price * item.quantity + (carriesShipping ? cfg.surcharge : 0)),
    };
  });

  return { lines, itemsTotal, surcharge, total: money(itemsTotal + surcharge) };
}
