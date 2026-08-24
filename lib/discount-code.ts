// Kody rabatowe – wspólna logika dla panelu, formularza zamówienia i serwera.
//
// Kod to rabat procentowy z własnym oknem czasu (jak przecena produktu) plus
// jedna decyzja: czy **łączy się** z pozostałymi rabatami.
//   • łączony    – schodzi z cen już przecenionych, promocja „Wielosztuki”
//                  działa normalnie, wszystko się sumuje;
//   • niełączony – kod działa sam (bez rabatów produktowych i bez „Wielosztuk”),
//                  a sklep liczy oba warianty i wybiera **tańszy dla klienta**.
//
// Moduł jest neutralny (same funkcje, bez bazy) – używa go panel, `CheckoutForm`
// i `/api/checkout`, dzięki czemu klient widzi dokładnie tę kwotę, którą policzy
// serwer.

import {
  BUNDLE_OFF,
  bundleSummary,
  type BundleConfig,
  type BundleSummary,
} from "@/lib/bundled-shipping";
import { MAX_DISCOUNT_PERCENT, activeDiscountPercent } from "@/lib/product-price";

/** Kwoty są typu Float – każdy wynik zaokrąglamy do groszy (patrz CLAUDE.md). */
const money = (value: number): number => Math.round(value * 100) / 100;

/** Kod: wielkie litery, cyfry i myślniki, 3–32 znaki. */
export const CODE_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]{1,30}[A-Z0-9])$/;
export const CODE_MAX_LENGTH = 32;
export const MAX_CODE_PERCENT = MAX_DISCOUNT_PERCENT;

/** Wpisany kod sprowadzony do postaci z bazy (wielkie litery, bez spacji). */
export function normalizeCode(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toUpperCase().replace(/\s+/g, "").slice(0, CODE_MAX_LENGTH);
}

export function isValidCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** Dane kodu potrzebne do policzenia zamówienia. */
export type DiscountCodeInfo = {
  code: string;
  percent: number;
  /** true = sumuje się z innymi rabatami; false = wybieramy korzystniejszy wariant. */
  stackable: boolean;
};

/** Rekord kodu (z bazy albo z formularza) razem z oknem obowiązywania. */
export type DiscountCodeRecord = DiscountCodeInfo & {
  active: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
};

/**
 * Rabat kodu obowiązujący w danej chwili – 0, gdy kod jest wyłączony albo poza
 * swoim oknem. Okno liczy ta sama funkcja co przy przecenach produktów, więc
 * daty zachowują się identycznie (czas polski ustawiany w panelu, UTC w bazie).
 */
export function activeCodePercent(code: DiscountCodeRecord, now?: Date): number {
  if (!code.active) return 0;
  return activeDiscountPercent(
    {
      discountPercent: code.percent,
      discountStartsAt: code.startsAt,
      discountEndsAt: code.endsAt,
    },
    { now }
  );
}

/** Stan kodu do opisów w panelu. */
export type CodeState = "inactive" | "scheduled" | "active" | "expired";

export function codeState(code: DiscountCodeRecord, now: Date = new Date()): CodeState {
  if (!code.active) return "inactive";
  const nowMs = now.getTime();
  const starts = code.startsAt ? new Date(code.startsAt).getTime() : null;
  const ends = code.endsAt ? new Date(code.endsAt).getTime() : null;
  if (ends !== null && !Number.isNaN(ends) && ends <= nowMs) return "expired";
  if (starts !== null && !Number.isNaN(starts) && starts > nowMs) return "scheduled";
  return "active";
}

// ── Wycena zamówienia ────────────────────────────────────────────────────────

export type ShippingMethod = "courier" | "parcel_locker" | "pickup";

export type ShippingParams = {
  method: ShippingMethod;
  courier: number;
  parcelLocker: number;
  freeEnabled: boolean;
  freeFrom: number;
};

/** Pozycja koszyka: `price` = cena po rabacie produktowym, `basePrice` = sprzed niego. */
export type PricedItem = { price: number; basePrice?: number | null; quantity: number };

export type OrderPricing<T extends PricedItem> = {
  /** „promo” = rabaty sklepu (kod łączony wchodzi do nich), „code” = sam kod. */
  variant: "promo" | "code";
  /** Ceny jednostkowe do zapisania w zamówieniu (po rabatach, bez narzutu wysyłki). */
  items: { item: T; unitPrice: number }[];
  /** Rozbicie pokazywane klientowi (z rozłożonym narzutem promocji „Wielosztuki”). */
  display: BundleSummary<T & { price: number }>;
  /** Konfiguracja promocji „Wielosztuki” użyta w tym wariancie. */
  bundle: BundleConfig;
  /** Suma cen pozycji po rabatach, bez wysyłki. */
  itemsTotal: number;
  /** Upust z rabatów sklepu (przeceny produktów + „Wielosztuki”), bez kodu. */
  promoDiscount: number;
  /** Upust z samego kodu (0, gdy kod nie wszedł). */
  codeDiscount: number;
  shippingCost: number;
  total: number;
  /** Kod, który realnie wpłynął na kwotę (null = żaden). */
  appliedCode: DiscountCodeInfo | null;
};

function listPrice(item: PricedItem): number {
  return typeof item.basePrice === "number" && Number.isFinite(item.basePrice)
    ? Math.max(item.basePrice, item.price)
    : item.price;
}

function shippingFor(itemsTotal: number, bundle: BundleConfig, s: ShippingParams): number {
  // Odbiór osobisty nie ma wysyłki, więc nie ma też czego doliczać – dotyczy to
  // także promocji „Wielosztuki”, gdzie narzut siedzi w cenach katalogowych.
  // Wcześniej promocja pobierała narzut również przy odbiorze, a sklep pisał
  // wtedy „Bezpłatnie” – klient dopłacał za wysyłkę, której nie było.
  if (s.method === "pickup") return 0;
  // Promocja „Wielosztuki”: narzut jest ten sam dla obu metod wysyłki – siedzi
  // w cenach katalogowych, które widział klient
  if (bundle.enabled) return money(bundle.surcharge);
  const raw = s.method === "parcel_locker" ? s.parcelLocker : s.courier;
  return s.freeEnabled && itemsTotal >= s.freeFrom ? 0 : money(raw);
}

/** Jeden wariant wyceny – ceny pozycji są już ustalone. */
function priceVariant<T extends PricedItem>(
  items: T[],
  unitPrices: number[],
  bundle: BundleConfig,
  shipping: ShippingParams
) {
  const priced = items.map((item, i) => ({ ...item, price: unitPrices[i] }));
  const itemsTotal = money(
    priced.reduce((sum, i) => sum + i.price * i.quantity, 0)
  );
  const shippingCost = shippingFor(itemsTotal, bundle, shipping);
  // Rozbicie pokazywane klientowi musi zsumować się do kwoty realnie płaconej:
  // odniesieniem zostaje narzut z cen katalogowych, ale doliczamy tylko tyle,
  // ile faktycznie wchodzi na fakturę (przy odbiorze osobistym – nic)
  const displayBundle: BundleConfig = bundle.enabled
    ? { ...bundle, chargedSurcharge: shippingCost }
    : bundle;
  return {
    priced,
    itemsTotal,
    shippingCost,
    total: money(itemsTotal + shippingCost),
    display: bundleSummary(priced, displayBundle),
  };
}

/**
 * Kwota zamówienia z uwzględnieniem przecen produktów, promocji „Wielosztuki”
 * i kodu rabatowego.
 *
 * Kod **łączony** schodzi z cen już przecenionych – wszystkie rabaty się sumują.
 * Kod **niełączony** wyklucza pozostałe promocje, więc liczymy oba warianty
 * (sklepowy bez kodu i sam kod od cen podstawowych, bez „Wielosztuk”) i bierzemy
 * ten o niższej kwocie do zapłaty; przy remisie zostają promocje sklepu, żeby
 * nie zużywać kodu bez korzyści dla klienta.
 */
export function priceOrder<T extends PricedItem>({
  items,
  bundle,
  code,
  shipping,
}: {
  items: T[];
  bundle: BundleConfig;
  code: DiscountCodeInfo | null;
  shipping: ShippingParams;
}): OrderPricing<T> {
  const percent = code && code.percent > 0 ? Math.min(code.percent, MAX_CODE_PERCENT) : 0;
  const factor = 1 - percent / 100;

  // Wariant sklepowy: ceny po rabatach produktowych, promocja „Wielosztuki”
  // według ustawień. Kod łączony schodzi dodatkowo z każdej pozycji.
  const stacked = percent > 0 && code!.stackable;
  const promoUnits = items.map((i) => (stacked ? money(i.price * factor) : money(i.price)));
  const promo = priceVariant(items, promoUnits, bundle, shipping);

  // Ten sam wariant bez kodu – potrzebny, żeby rozdzielić w podsumowaniu upust
  // sklepowy od upustu z kodu
  const promoNoCode = stacked
    ? priceVariant(items, items.map((i) => money(i.price)), bundle, shipping)
    : promo;

  const promoResult: OrderPricing<T> = {
    variant: "promo",
    items: items.map((item, i) => ({ item, unitPrice: promoUnits[i] })),
    display: promo.display,
    bundle,
    itemsTotal: promo.itemsTotal,
    // Upust sklepowy bierzemy z rozbicia koszyka (ceny + narzut „Wielosztuk”),
    // a nie z kwoty do zapłaty – inaczej przy wyłączonej promocji odejmowałaby
    // się od niego wysyłka i wychodziła liczba ujemna
    promoDiscount: promoNoCode.display.discountTotal,
    codeDiscount: stacked ? money(promoNoCode.itemsTotal - promo.itemsTotal) : 0,
    shippingCost: promo.shippingCost,
    total: promo.total,
    appliedCode: stacked ? { ...code! } : null,
  };

  if (percent === 0 || code!.stackable) return promoResult;

  // Wariant „sam kod”: rabat schodzi z cen podstawowych, bez przecen produktów
  // i bez promocji „Wielosztuki” (wysyłka liczona zwyczajnie)
  const codeUnits = items.map((i) => money(listPrice(i) * factor));
  const only = priceVariant(items, codeUnits, BUNDLE_OFF, shipping);
  const codeResult: OrderPricing<T> = {
    variant: "code",
    items: items.map((item, i) => ({ item, unitPrice: codeUnits[i] })),
    display: only.display,
    bundle: BUNDLE_OFF,
    itemsTotal: only.itemsTotal,
    promoDiscount: 0,
    codeDiscount: money(
      items.reduce((sum, i) => sum + listPrice(i) * i.quantity, 0) - only.itemsTotal
    ),
    shippingCost: only.shippingCost,
    total: only.total,
    appliedCode: { ...code! },
  };

  // Remis zostawia promocje sklepu – kod niech poczeka na zamówienie,
  // w którym naprawdę pomoże
  return codeResult.total < promoResult.total ? codeResult : promoResult;
}
