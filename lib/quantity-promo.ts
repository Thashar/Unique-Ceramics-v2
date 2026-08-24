// Rabat ilościowy – nagroda za kupowanie większej liczby sztuk.
//
// Zastąpił promocję „Wielosztuki”, która nie była rabatem: podnosiła cenę
// katalogową o koszt wysyłki i oddawała nadwyżkę jako „rabat”, przez co suma
// zamówienia wychodziła identycznie jak bez promocji.
//
// Tutaj rabat jest realny: im więcej **kwalifikujących się** sztuk w koszyku,
// tym wyższy procent schodzący z cen. Moduł jest neutralny (same funkcje, bez
// bazy) – używa go serwer (`/api/checkout`), panel i komponenty klienckie,
// dzięki czemu klient widzi dokładnie tę kwotę, którą policzy serwer.
//
// ── Odporność na nadużycia ──────────────────────────────────────────────────
//
// Rabat procentowy naliczany na cały koszyk zaprasza do kombinowania, więc
// mechanika ma cztery zabezpieczenia:
//
//  1. `minItemPrice` – pozycja tańsza niż próg **nie liczy się do progu ani nie
//     dostaje rabatu**. Dokładanie taniochy, żeby odblokować rabat na drogi
//     produkt, przestaje mieć sens.
//  2. `minValue` na progu – próg może wymagać **oraz** minimalnej wartości
//     kwalifikującej się części koszyka, więc sam licznik sztuk nie wystarcza.
//  3. Rabat jest **procentowy i proporcjonalny** – każda kwalifikująca się sztuka
//     tanieje o ten sam procent. Nie ma pozycji „prawie za darmo”, którą opłaca
//     się zatrzymać przy zwrocie reszty zamówienia.
//  4. `maxDiscount` – twardy limit kwoty rabatu na zamówienie.
//
// Do tego `includeDiscountedProducts` decyduje, czy produkty z własną przeceną
// w ogóle biorą udział, a `stackable` – czy rabat sumuje się z kodem rabatowym.

import { MAX_DISCOUNT_PERCENT, isWithinWindow } from "@/lib/product-price";

/** Kwoty są typu Float – każdy wynik zaokrąglamy do groszy (patrz CLAUDE.md). */
const money = (value: number): number => Math.round(value * 100) / 100;

/** Ile progów ma sens w jednej promocji – tyle też przyjmuje panel. */
export const MAX_TIERS = 10;

export type QuantityTier = {
  /** Próg w sztukach kwalifikujących się. */
  minPieces: number;
  /** Dodatkowy próg kwotowy (warunek ORAZ); null = bez warunku wartości. */
  minValue: number | null;
  /** Rabat w procentach, 1–MAX_DISCOUNT_PERCENT. */
  percent: number;
};

export type QuantityPromoConfig = {
  name: string;
  active: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  stackable: boolean;
  includeDiscountedProducts: boolean;
  minItemPrice: number;
  maxDiscount: number | null;
  tiers: QuantityTier[];
};

/** Pozycja koszyka w zakresie potrzebnym do policzenia rabatu ilościowego. */
export type QuantityItem = {
  /** Cena sztuki **po** rabacie produktowym – to ona jest bazą dalszych rabatów. */
  price: number;
  /** Cena sprzed rabatu produktowego; wyższa od `price` = produkt jest przeceniony. */
  basePrice?: number | null;
  quantity: number;
};

export type QuantityDiscountResult = {
  /** Procent zdobytego progu (0 = rabat nie przysługuje). */
  percent: number;
  tier: QuantityTier | null;
  /** Ceny jednostkowe po rabacie – ta sama kolejność co wejście. */
  unitPrices: number[];
  /** Kwota rabatu policzona z **zaokrąglonych** cen jednostkowych. */
  discountTotal: number;
  eligiblePieces: number;
  eligibleValue: number;
  /** Ile pozycji odpadło przez `minItemPrice` albo własną przecenę. */
  excludedPieces: number;
  /** Najbliższy lepszy próg – do zachęty „dodaj jeszcze N szt.”. */
  nextTier: NextTierHint | null;
};

export type NextTierHint = {
  tier: QuantityTier;
  /** Ilu sztuk brakuje do progu (0 = warunek sztuk już spełniony). */
  piecesMissing: number;
  /** Ile złotych brakuje do progu wartości (0 = spełniony albo brak warunku). */
  valueMissing: number;
};

/** Promocja obowiązująca w tej chwili – `null`, gdy wyłączona albo poza oknem. */
export function activeQuantityPromo<T extends QuantityPromoConfig>(
  promo: T | null | undefined,
  { now, holdMs = 0 }: { now?: Date; holdMs?: number } = {}
): T | null {
  if (!promo || !promo.active) return null;
  if (normalizeTiers(promo.tiers).length === 0) return null;
  return isWithinWindow(promo.startsAt, promo.endsAt, { now, holdMs }) ? promo : null;
}

/** Progi sprowadzone do poprawnej postaci i posortowane rosnąco po liczbie sztuk. */
export function normalizeTiers(raw: unknown): QuantityTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers: QuantityTier[] = [];
  for (const entry of raw.slice(0, MAX_TIERS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const t = entry as Record<string, unknown>;

    const minPieces = Math.trunc(Number(t.minPieces));
    if (!Number.isFinite(minPieces) || minPieces < 2) continue; // rabat za wolumen zaczyna się od 2 szt.

    const percent = Math.trunc(Number(t.percent));
    if (!Number.isFinite(percent) || percent < 1) continue;

    const rawValue = t.minValue;
    const minValue =
      rawValue == null || rawValue === "" ? null : Math.max(0, money(Number(rawValue)));

    tiers.push({
      minPieces,
      minValue: minValue !== null && Number.isFinite(minValue) ? minValue : null,
      percent: Math.min(percent, MAX_DISCOUNT_PERCENT),
    });
  }
  return tiers.sort((a, b) => a.minPieces - b.minPieces || a.percent - b.percent);
}

/** Czy pozycja ma własną przecenę produktową. */
function isDiscounted(item: QuantityItem): boolean {
  return (
    typeof item.basePrice === "number" &&
    Number.isFinite(item.basePrice) &&
    item.basePrice > item.price
  );
}

/**
 * Czy pozycja bierze udział w promocji. To **jedno miejsce** decyduje zarówno
 * o liczeniu progu, jak i o naliczeniu rabatu – pozycja nie może liczyć się do
 * progu, a potem nie dostać rabatu (albo odwrotnie), bo to otwierałoby drogę do
 * dobijania progu rzeczami, za które klient i tak nie płaci pełnej ceny.
 */
function isEligible(item: QuantityItem, promo: QuantityPromoConfig): boolean {
  if (item.quantity < 1) return false;
  if (item.price < promo.minItemPrice) return false;
  if (!promo.includeDiscountedProducts && isDiscounted(item)) return false;
  return true;
}

/** Najlepszy próg dla danego koszyka – wygrywa najwyższy procent, nie kolejność w liście. */
function bestTier(
  tiers: QuantityTier[],
  pieces: number,
  value: number
): QuantityTier | null {
  let best: QuantityTier | null = null;
  for (const tier of tiers) {
    if (pieces < tier.minPieces) continue;
    if (tier.minValue !== null && value < tier.minValue) continue;
    if (!best || tier.percent > best.percent) best = tier;
  }
  return best;
}

/** Najbliższy próg dający **więcej** niż obecny – do podpowiedzi w koszyku. */
function findNextTier(
  tiers: QuantityTier[],
  pieces: number,
  value: number,
  currentPercent: number
): NextTierHint | null {
  let hint: NextTierHint | null = null;
  for (const tier of tiers) {
    if (tier.percent <= currentPercent) continue;
    const piecesMissing = Math.max(0, tier.minPieces - pieces);
    const valueMissing = tier.minValue === null ? 0 : Math.max(0, money(tier.minValue - value));
    if (piecesMissing === 0 && valueMissing === 0) continue; // już spełniony
    // Najbliższy = najmniej brakujących sztuk, potem najmniejsza brakująca kwota
    if (
      !hint ||
      piecesMissing < hint.piecesMissing ||
      (piecesMissing === hint.piecesMissing && valueMissing < hint.valueMissing)
    ) {
      hint = { tier, piecesMissing, valueMissing };
    }
  }
  return hint;
}

/** Wynik dla koszyka bez rabatu ilościowego – ceny zostają bez zmian. */
function noDiscount(items: QuantityItem[]): QuantityDiscountResult {
  return {
    percent: 0,
    tier: null,
    unitPrices: items.map((i) => money(i.price)),
    discountTotal: 0,
    eligiblePieces: 0,
    eligibleValue: 0,
    excludedPieces: items.reduce((sum, i) => sum + i.quantity, 0),
    nextTier: null,
  };
}

/**
 * Nalicza rabat ilościowy na koszyk.
 *
 * Zwrócone `unitPrices` są **cenami do zapisania w zamówieniu** – kwota
 * zamówienia to ich suma przez ilości, więc `discountTotal` liczymy z już
 * zaokrąglonych kwot. Dzięki temu nie powstaje reszta, którą trzeba by gdzieś
 * doklejać, a suma zawsze zgadza się co do grosza.
 *
 * `maxDiscount` jest respektowany z dokładnością do zaokrągleń pojedynczych
 * pozycji (do grosza na pozycję) – limit działa na współczynnik, a ceny
 * jednostkowe muszą zostać kwotami w groszach.
 */
export function applyQuantityDiscount(
  items: QuantityItem[],
  promo: QuantityPromoConfig | null
): QuantityDiscountResult {
  if (!promo || items.length === 0) return noDiscount(items);

  const tiers = normalizeTiers(promo.tiers);
  if (tiers.length === 0) return noDiscount(items);

  const eligible = items.map((item) => isEligible(item, promo));
  const eligiblePieces = items.reduce(
    (sum, item, i) => sum + (eligible[i] ? item.quantity : 0),
    0
  );
  const eligibleValue = money(
    items.reduce((sum, item, i) => sum + (eligible[i] ? item.price * item.quantity : 0), 0)
  );
  const excludedPieces = items.reduce(
    (sum, item, i) => sum + (eligible[i] ? 0 : item.quantity),
    0
  );

  const tier = bestTier(tiers, eligiblePieces, eligibleValue);
  const percent = tier?.percent ?? 0;
  const nextTier = findNextTier(tiers, eligiblePieces, eligibleValue, percent);

  if (percent === 0 || eligibleValue <= 0) {
    return {
      ...noDiscount(items),
      eligiblePieces,
      eligibleValue,
      excludedPieces,
      nextTier,
    };
  }

  // Limit kwotowy działa przez obniżenie efektywnego procentu – rabat zostaje
  // proporcjonalny, tylko słabszy
  const rawDiscount = money((eligibleValue * percent) / 100);
  const capped =
    promo.maxDiscount != null && promo.maxDiscount >= 0
      ? Math.min(rawDiscount, money(promo.maxDiscount))
      : rawDiscount;
  const factor = capped >= eligibleValue ? 0 : (eligibleValue - capped) / eligibleValue;

  const unitPrices = items.map((item, i) =>
    eligible[i] ? money(item.price * factor) : money(item.price)
  );

  const before = money(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const after = money(
    items.reduce((sum, item, i) => sum + unitPrices[i] * item.quantity, 0)
  );

  return {
    percent,
    tier,
    unitPrices,
    discountTotal: money(before - after),
    eligiblePieces,
    eligibleValue,
    excludedPieces,
    nextTier,
  };
}

// ── Teksty dla sklepu ────────────────────────────────────────────────────────

/** Najniższy próg – zachęta na karcie produktu i w katalogu. */
export function lowestTier(promo: QuantityPromoConfig | null): QuantityTier | null {
  if (!promo) return null;
  const tiers = normalizeTiers(promo.tiers);
  return tiers.length > 0 ? tiers[0] : null;
}

/** „Kup 3 szt. i zyskaj −10%” – jedno zdanie zachęty, bez mechaniki. */
export function quantityPromoTeaser(promo: QuantityPromoConfig | null): string | null {
  const tier = lowestTier(promo);
  if (!tier) return null;
  const value = tier.minValue !== null ? ` za min. ${formatZl(tier.minValue)}` : "";
  return `Kup ${tier.minPieces} szt.${value} i zyskaj −${tier.percent}%`;
}

/** „Dodaj jeszcze 2 szt., by zyskać −15%” – podpowiedź w koszyku. */
export function nextTierHintText(hint: NextTierHint | null): string | null {
  if (!hint) return null;
  const parts: string[] = [];
  if (hint.piecesMissing > 0) {
    parts.push(`${hint.piecesMissing} ${pieceWord(hint.piecesMissing)}`);
  }
  if (hint.valueMissing > 0) parts.push(`za ${formatZl(hint.valueMissing)}`);
  if (parts.length === 0) return null;
  return `Dodaj jeszcze ${parts.join(" ")}, by zyskać −${hint.tier.percent}%`;
}

function pieceWord(n: number): string {
  if (n === 1) return "sztukę";
  const last = n % 10;
  const lastTwo = n % 100;
  const few = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return few ? "sztuki" : "sztuk";
}

function formatZl(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} zł`;
}

// ── Walidacja danych z panelu ────────────────────────────────────────────────

export type ValidQuantityPromo = {
  name: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  stackable: boolean;
  includeDiscountedProducts: boolean;
  minItemPrice: number;
  maxDiscount: number | null;
  tiers: QuantityTier[];
};

const INVALID_DATE = Symbol("invalid-date");

function parseDateField(value: unknown): Date | null | typeof INVALID_DATE {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? INVALID_DATE : value;
  if (typeof value !== "string") return INVALID_DATE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? INVALID_DATE : date;
}

export function validateQuantityPromo(
  body: unknown
): { ok: true; data: ValidQuantityPromo } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Nieprawidłowe dane promocji." };
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 100) {
    return { ok: false, error: "Nazwa promocji jest wymagana (maks. 100 znaków)." };
  }

  const tiers = normalizeTiers(b.tiers);
  if (tiers.length === 0) {
    return {
      ok: false,
      error: `Dodaj co najmniej jeden próg: od 2 sztuk i rabat 1–${MAX_DISCOUNT_PERCENT}%.`,
    };
  }
  // Wyższy próg musi dawać więcej – inaczej klient traci na dołożeniu sztuki
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].percent <= tiers[i - 1].percent) {
      return {
        ok: false,
        error: "Każdy kolejny próg musi dawać wyższy rabat niż poprzedni.",
      };
    }
  }

  const minItemPrice = b.minItemPrice == null || b.minItemPrice === "" ? 0 : Number(b.minItemPrice);
  if (!Number.isFinite(minItemPrice) || minItemPrice < 0) {
    return { ok: false, error: "Minimalna cena pozycji musi być liczbą ≥ 0." };
  }

  const rawMax = b.maxDiscount;
  const maxDiscount = rawMax == null || rawMax === "" ? null : Number(rawMax);
  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) {
    return { ok: false, error: "Limit rabatu musi być liczbą większą od zera albo pusty." };
  }

  const startsRaw = parseDateField(b.startsAt);
  if (startsRaw === INVALID_DATE) {
    return { ok: false, error: "Nieprawidłowa data rozpoczęcia." };
  }
  const endsRaw = parseDateField(b.endsAt);
  if (endsRaw === INVALID_DATE) {
    return { ok: false, error: "Nieprawidłowa data zakończenia." };
  }
  if (startsRaw && endsRaw && endsRaw.getTime() <= startsRaw.getTime()) {
    return { ok: false, error: "Koniec musi być późniejszy niż początek." };
  }

  return {
    ok: true,
    data: {
      name,
      active: b.active !== false,
      startsAt: startsRaw,
      endsAt: endsRaw,
      stackable: b.stackable !== false,
      // Domyślnie ostrożnie: produkty z własną przeceną nie kumulują rabatów
      includeDiscountedProducts: b.includeDiscountedProducts === true,
      minItemPrice: money(minItemPrice),
      maxDiscount: maxDiscount === null ? null : money(maxDiscount),
      tiers,
    },
  };
}
