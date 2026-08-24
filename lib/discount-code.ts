// Kody rabatowe **oraz wycena całego zamówienia** – wspólna logika dla panelu,
// formularza zamówienia i serwera.
//
// Kod to rabat procentowy z własnym oknem czasu (jak przecena produktu) plus
// jedna decyzja: czy **łączy się** z pozostałymi rabatami.
//   • łączony    – schodzi z cen już przecenionych, rabat ilościowy działa
//                  normalnie, wszystko się sumuje;
//   • niełączony – kod działa sam (bez przecen produktów i bez rabatu
//                  ilościowego), a sklep liczy oba warianty i wybiera
//                  **tańszy dla klienta**.
//
// Moduł jest neutralny (same funkcje, bez bazy) – używa go panel, `CheckoutForm`
// i `/api/checkout`, dzięki czemu klient widzi dokładnie tę kwotę, którą policzy
// serwer.

import {
  MAX_DISCOUNT_PERCENT,
  isWithinWindow,
  normalizeDiscountPercent,
  shownDiscountPercent,
} from "@/lib/product-price";
import {
  applyQuantityDiscount,
  type NextTierHint,
  type QuantityPromoConfig,
} from "@/lib/quantity-promo";
import { isShippingFree, type FreeShippingConfig } from "@/lib/free-shipping";

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
  /** Rabat w % (0 = kod działa wyłącznie przez darmową wysyłkę). */
  percent: number;
  /** Kod zeruje koszt wysyłki – niezależnie od promocji „Darmowa wysyłka”. */
  freeShipping: boolean;
  /** true = sumuje się z innymi rabatami; false = wybieramy korzystniejszy wariant. */
  stackable: boolean;
};

/** Czy kod cokolwiek daje – bez tego nie ma sensu go stosować. */
export function codeHasEffect(code: Pick<DiscountCodeInfo, "percent" | "freeShipping">): boolean {
  return code.percent > 0 || code.freeShipping;
}

/** Rekord kodu (z bazy albo z formularza) razem z oknem obowiązywania. */
export type DiscountCodeRecord = DiscountCodeInfo & {
  active: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
};

/**
 * Czy kod obowiązuje w danej chwili – jest włączony i mieści się w swoim oknie.
 *
 * **Osobno od procentu**: kod na samą darmową wysyłkę ma `percent = 0`, więc
 * pytanie „ile procent" nie może decydować o tym, czy kod w ogóle działa.
 * Okno liczy ta sama funkcja co przy przecenach produktów, więc daty zachowują
 * się identycznie (czas polski ustawiany w panelu, UTC w bazie).
 */
export function isCodeActive(code: DiscountCodeRecord, now?: Date): boolean {
  if (!code.active) return false;
  return isWithinWindow(code.startsAt, code.endsAt, { now });
}

/** Rabat procentowy kodu obowiązujący w danej chwili – 0 poza oknem. */
export function activeCodePercent(code: DiscountCodeRecord, now?: Date): number {
  if (!isCodeActive(code, now)) return 0;
  return normalizeDiscountPercent(code.percent);
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
  /** Promocja „Darmowa wysyłka” obowiązująca w tej chwili (null = brak). */
  freeShipping: FreeShippingConfig | null;
};

/** Pozycja koszyka: `price` = cena po rabacie produktowym, `basePrice` = sprzed niego. */
export type PricedItem = { price: number; basePrice?: number | null; quantity: number };

/** Pozycja w rozbiciu pokazywanym klientowi. */
export type PricedLine<T> = {
  item: T;
  /** Cena sprzed wszystkich rabatów – od niej liczymy upust. */
  catalogUnitPrice: number;
  /** Cena sztuki po wszystkich rabatach – ta trafia do zamówienia. */
  unitPrice: number;
  /** Upust na sztuce w procentach, policzony z dwóch kwot obok siebie. */
  discountPercent: number;
  lineTotal: number;
};

export type PricingDisplay<T> = {
  lines: PricedLine<T>[];
  /** Suma pozycji w cenach sprzed rabatów. */
  catalogTotal: number;
  /** Łączny upust: przeceny produktów + rabat ilościowy + kod. */
  discountTotal: number;
  discountPercent: number;
  /** Suma pozycji po rabatach (bez wysyłki). */
  itemsTotal: number;
};

export type OrderPricing<T extends PricedItem> = {
  /** „promo” = rabaty sklepu (kod łączony wchodzi do nich), „code” = sam kod. */
  variant: "promo" | "code";
  /** Ceny jednostkowe do zapisania w zamówieniu (po wszystkich rabatach). */
  items: { item: T; unitPrice: number }[];
  /** Rozbicie pokazywane klientowi. */
  display: PricingDisplay<T>;
  /** Suma cen pozycji po rabatach, bez wysyłki. */
  itemsTotal: number;
  /** Upust z przecen produktowych. */
  productDiscount: number;
  /** Procent zdobytego progu rabatu ilościowego (0 = nie wszedł). */
  quantityPercent: number;
  /** Upust z rabatu ilościowego. */
  quantityDiscount: number;
  /** Najbliższy lepszy próg – do zachęty „dodaj jeszcze N szt.”. */
  quantityNextTier: NextTierHint | null;
  /** Upust z samego kodu (0, gdy kod nie wszedł). */
  codeDiscount: number;
  /** Upust z rabatów sklepu razem (przeceny + ilościowy), bez kodu. */
  promoDiscount: number;
  shippingCost: number;
  /** Czy wysyłka wyszła darmowa z promocji (nie z odbioru osobistego). */
  shippingFree: boolean;
  total: number;
  /** Kod, który realnie wpłynął na kwotę (null = żaden). */
  appliedCode: DiscountCodeInfo | null;
};

function listPrice(item: PricedItem): number {
  return typeof item.basePrice === "number" && Number.isFinite(item.basePrice)
    ? Math.max(item.basePrice, item.price)
    : item.price;
}

/**
 * Koszt wysyłki. Kolejność ma znaczenie: **odbiór osobisty nie ma wysyłki**,
 * więc nie ma też czego doliczać ani zerować. Dalej kod rabatowy na darmową
 * wysyłkę (bezwarunkowo), potem promocja „Darmowa wysyłka” (próg liczony od
 * kwoty **po rabatach**, żeby nie dało się odblokować jej kwotą, której klient
 * realnie nie płaci), a na końcu stawka wybranej metody.
 */
function shippingFor(
  itemsTotal: number,
  s: ShippingParams,
  codeFreeShipping: boolean
): number {
  if (s.method === "pickup") return 0;
  // Kod na darmową wysyłkę działa **niezależnie od progu** promocji wysyłkowej –
  // po to właśnie się go wydaje
  if (codeFreeShipping) return 0;
  if (isShippingFree(s.freeShipping, s.method, itemsTotal)) return 0;
  return money(s.method === "parcel_locker" ? s.parcelLocker : s.courier);
}

/** Jeden policzony wariant – ceny jednostkowe są już ustalone. */
function buildVariant<T extends PricedItem>(
  variant: "promo" | "code",
  items: T[],
  unitPrices: number[],
  shipping: ShippingParams,
  parts: {
    productDiscount: number;
    quantityPercent: number;
    quantityDiscount: number;
    quantityNextTier: NextTierHint | null;
    appliedCode: DiscountCodeInfo | null;
  }
): OrderPricing<T> {
  const itemsTotal = money(
    items.reduce((sum, item, i) => sum + unitPrices[i] * item.quantity, 0)
  );
  // Darmową wysyłkę daje tylko kod, który w tym wariancie **realnie wszedł**
  const shippingCost = shippingFor(
    itemsTotal,
    shipping,
    parts.appliedCode?.freeShipping === true
  );

  const lines: PricedLine<T>[] = items.map((item, i) => {
    const catalogUnitPrice = money(listPrice(item));
    const unitPrice = unitPrices[i];
    return {
      item,
      catalogUnitPrice,
      unitPrice,
      discountPercent: shownDiscountPercent(catalogUnitPrice, unitPrice),
      lineTotal: money(unitPrice * item.quantity),
    };
  });

  const catalogTotal = money(
    items.reduce((sum, item) => sum + listPrice(item) * item.quantity, 0)
  );
  const discountTotal = money(catalogTotal - itemsTotal);

  // Kod dostaje resztę upustu – dzięki temu rozbicie zawsze sumuje się do
  // kwoty realnie zapłaconej, niezależnie od zaokrągleń pojedynczych pozycji
  const codeDiscount = parts.appliedCode
    ? Math.max(0, money(discountTotal - parts.productDiscount - parts.quantityDiscount))
    : 0;

  return {
    variant,
    items: items.map((item, i) => ({ item, unitPrice: unitPrices[i] })),
    display: {
      lines,
      catalogTotal,
      discountTotal,
      discountPercent: shownDiscountPercent(catalogTotal, itemsTotal),
      itemsTotal,
    },
    itemsTotal,
    productDiscount: parts.productDiscount,
    quantityPercent: parts.quantityPercent,
    quantityDiscount: parts.quantityDiscount,
    quantityNextTier: parts.quantityNextTier,
    codeDiscount,
    promoDiscount: money(parts.productDiscount + parts.quantityDiscount),
    shippingCost,
    shippingFree: shipping.method !== "pickup" && shippingCost === 0,
    total: money(itemsTotal + shippingCost),
    appliedCode: parts.appliedCode,
  };
}

/**
 * Kwota zamówienia z uwzględnieniem przecen produktów, rabatu ilościowego,
 * kodu rabatowego i promocji „Darmowa wysyłka”.
 *
 * Kolejność: cena bazowa → przecena produktowa (jest już w `item.price`) →
 * rabat ilościowy → kod → wysyłka.
 *
 * Łączenie rabatów jest **konfigurowalne po obu stronach**: kod ma `stackable`,
 * rabat ilościowy też. Gdy którakolwiek strona odmawia łączenia, liczymy kilka
 * wariantów i wybieramy **tańszy dla klienta**; przy remisie zostają promocje
 * sklepu, żeby nie zużywać kodu bez korzyści.
 */
export function priceOrder<T extends PricedItem>({
  items,
  quantityPromo = null,
  code,
  shipping,
}: {
  items: T[];
  /** Rabat ilościowy obowiązujący teraz (null = brak). */
  quantityPromo?: QuantityPromoConfig | null;
  code: DiscountCodeInfo | null;
  shipping: ShippingParams;
}): OrderPricing<T> {
  const codePercent = code && code.percent > 0 ? Math.min(code.percent, MAX_CODE_PERCENT) : 0;
  // Kod „ma efekt”, gdy daje rabat **albo** darmową wysyłkę – kod wyłącznie
  // wysyłkowy ma `percent = 0`, więc sam procent nie może o tym decydować
  const hasCode = !!code && codeHasEffect(code);
  const codeFactor = 1 - codePercent / 100;

  // Upust z samych przecen produktowych – ten sam w każdym wariancie, który
  // w ogóle korzysta z cen po przecenie
  const productDiscount = money(
    items.reduce((sum, i) => sum + (listPrice(i) - i.price) * i.quantity, 0)
  );

  // Rabat ilościowy liczony **od cen po przecenie produktowej**
  const quantity = applyQuantityDiscount(items, quantityPromo);

  const candidates: OrderPricing<T>[] = [];

  // 1) Wariant sklepowy: przeceny + rabat ilościowy. Kod dokłada się tylko wtedy,
  //    gdy zgadzają się na to obie strony (kod i promocja ilościowa).
  const codeStacks = hasCode && code!.stackable && (!quantityPromo || quantityPromo.stackable);
  candidates.push(
    buildVariant(
      "promo",
      items,
      quantity.unitPrices.map((p) => (codeStacks ? money(p * codeFactor) : money(p))),
      shipping,
      {
        productDiscount,
        quantityPercent: quantity.percent,
        quantityDiscount: quantity.discountTotal,
        quantityNextTier: quantity.nextTier,
        appliedCode: codeStacks ? { ...code! } : null,
      }
    )
  );

  // 2) Kod bez rabatu ilościowego – gdy kod jest łączony, ale promocja ilościowa
  //    nie chce się z nim łączyć. Klient dostaje to, co dla niego korzystniejsze.
  if (hasCode && code!.stackable && quantityPromo && !quantityPromo.stackable) {
    candidates.push(
      buildVariant(
        "promo",
        items,
        items.map((i) => money(i.price * codeFactor)),
        shipping,
        {
          productDiscount,
          quantityPercent: 0,
          quantityDiscount: 0,
          quantityNextTier: quantity.nextTier,
          appliedCode: { ...code! },
        }
      )
    );
  }

  // 3) Sam kod od cen podstawowych – bez przecen produktowych i bez rabatu
  //    ilościowego. Wariant dla kodu oznaczonego jako niełączony.
  if (hasCode && !code!.stackable) {
    candidates.push(
      buildVariant(
        "code",
        items,
        items.map((i) => money(listPrice(i) * codeFactor)),
        shipping,
        {
          productDiscount: 0,
          quantityPercent: 0,
          quantityDiscount: 0,
          quantityNextTier: null,
          appliedCode: { ...code! },
        }
      )
    );
  }

  // Najtańszy dla klienta; remis zostawia wariant wcześniejszy, czyli promocje sklepu
  return candidates.reduce((best, c) => (c.total < best.total ? c : best));
}
