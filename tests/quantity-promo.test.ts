// Rabat ilościowy – progi, zabezpieczenia i odporność na nadużycia.
//
// Każdy wektor nadużycia opisany w CLAUDE.md ma tu własny test. To nie są testy
// „dla pokrycia”: mechanika decyduje o kwocie, którą płaci klient, a większość
// zabezpieczeń jest niewidoczna, dopóki ktoś ich nie spróbuje obejść.

import { describe, expect, it } from "vitest";
import {
  applyQuantityDiscount,
  activeQuantityPromo,
  lowestTier,
  nextTierHintText,
  normalizeTiers,
  quantityPromoTeaser,
  validateQuantityPromo,
  type QuantityPromoConfig,
} from "@/lib/quantity-promo";

/** Promocja bazowa: 3 szt → −5%, 5 szt → −10%, 10 szt → −20%. */
function promo(overrides: Partial<QuantityPromoConfig> = {}): QuantityPromoConfig {
  return {
    name: "Rabat ilościowy",
    active: true,
    startsAt: null,
    endsAt: null,
    stackable: true,
    includeDiscountedProducts: false,
    minItemPrice: 0,
    maxDiscount: null,
    tiers: [
      { minPieces: 3, minValue: null, percent: 5 },
      { minPieces: 5, minValue: null, percent: 10 },
      { minPieces: 10, minValue: null, percent: 20 },
    ],
    ...overrides,
  };
}

const item = (price: number, quantity: number, basePrice?: number) => ({
  price,
  quantity,
  ...(basePrice !== undefined ? { basePrice } : {}),
});

describe("progi", () => {
  it("poniżej najniższego progu nie ma rabatu", () => {
    const r = applyQuantityDiscount([item(100, 2)], promo());
    expect(r.percent).toBe(0);
    expect(r.discountTotal).toBe(0);
    expect(r.unitPrices).toEqual([100]);
  });

  it("wchodzi próg odpowiadający liczbie sztuk", () => {
    expect(applyQuantityDiscount([item(100, 3)], promo()).percent).toBe(5);
    expect(applyQuantityDiscount([item(100, 5)], promo()).percent).toBe(10);
    expect(applyQuantityDiscount([item(100, 10)], promo()).percent).toBe(20);
  });

  it("powyżej najwyższego progu zostaje najwyższy rabat", () => {
    expect(applyQuantityDiscount([item(100, 50)], promo()).percent).toBe(20);
  });

  it("sztuki sumują się z różnych pozycji", () => {
    const r = applyQuantityDiscount([item(100, 2), item(80, 3)], promo());
    expect(r.eligiblePieces).toBe(5);
    expect(r.percent).toBe(10);
  });

  it("wygrywa najwyższy rabat, nie kolejność progów w konfiguracji", () => {
    const odwrocone = promo({
      tiers: [
        { minPieces: 10, minValue: null, percent: 20 },
        { minPieces: 3, minValue: null, percent: 5 },
      ],
    });
    expect(applyQuantityDiscount([item(100, 10)], odwrocone).percent).toBe(20);
  });

  it("rabat jest proporcjonalny – każda sztuka tanieje o ten sam procent", () => {
    const r = applyQuantityDiscount([item(200, 2), item(50, 3)], promo());
    expect(r.percent).toBe(10);
    expect(r.unitPrices).toEqual([180, 45]);
  });
});

describe("odporność na nadużycia", () => {
  it("tania pozycja poniżej minItemPrice nie dobija progu ani nie dostaje rabatu", () => {
    // Klasyczny padding: 1 drogi produkt + 2 drobiazgi po 5 zł, żeby złapać próg 3 szt.
    const r = applyQuantityDiscount(
      [item(500, 1), item(5, 2)],
      promo({ minItemPrice: 20 })
    );
    expect(r.eligiblePieces).toBe(1);
    expect(r.excludedPieces).toBe(2);
    expect(r.percent).toBe(0);
    expect(r.unitPrices).toEqual([500, 5]);
  });

  it("tanie sztuki nie dostają rabatu nawet wtedy, gdy próg zdobyły droższe", () => {
    const r = applyQuantityDiscount(
      [item(100, 3), item(5, 4)],
      promo({ minItemPrice: 20 })
    );
    expect(r.percent).toBe(5);
    expect(r.unitPrices).toEqual([95, 5]); // drobiazg zostaje w cenie
  });

  it("próg wartościowy blokuje odblokowanie rabatu samą liczbą sztuk", () => {
    const zProgiem = promo({
      tiers: [{ minPieces: 3, minValue: 400, percent: 10 }],
    });
    expect(applyQuantityDiscount([item(50, 3)], zProgiem).percent).toBe(0);
    expect(applyQuantityDiscount([item(150, 3)], zProgiem).percent).toBe(10);
  });

  it("produkty z własną przeceną nie kumulują rabatów, gdy tak ustawiono", () => {
    const przeceniony = item(80, 3, 100); // −20% na produkcie
    const r = applyQuantityDiscount([przeceniony], promo());
    expect(r.eligiblePieces).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.unitPrices).toEqual([80]);
  });

  it("po włączeniu opcji przecenione produkty biorą udział", () => {
    const r = applyQuantityDiscount(
      [item(80, 3, 100)],
      promo({ includeDiscountedProducts: true })
    );
    expect(r.percent).toBe(5);
    expect(r.unitPrices).toEqual([76]);
  });

  it("przeceniony produkt nie dobija progu dla nieprzecenionych", () => {
    const r = applyQuantityDiscount([item(100, 2), item(80, 3, 100)], promo());
    expect(r.eligiblePieces).toBe(2); // tylko nieprzecenione
    expect(r.percent).toBe(0);
  });

  it("maxDiscount ogranicza kwotę rabatu", () => {
    const r = applyQuantityDiscount(
      [item(1000, 10)],
      promo({ maxDiscount: 100 })
    );
    expect(r.percent).toBe(20); // próg zdobyty
    expect(r.discountTotal).toBeLessThanOrEqual(100); // ale kwota przycięta
    expect(r.discountTotal).toBeGreaterThan(99);
  });

  it("bez limitu ten sam koszyk dostaje pełny rabat", () => {
    const r = applyQuantityDiscount([item(1000, 10)], promo());
    expect(r.discountTotal).toBe(2000); // 20% z 10 000
  });
});

describe("okno obowiązywania", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("promocja poza oknem nie obowiązuje", () => {
    expect(
      activeQuantityPromo(promo({ startsAt: "2026-07-01T00:00:00Z" }), { now })
    ).toBeNull();
    expect(
      activeQuantityPromo(promo({ endsAt: "2026-06-01T00:00:00Z" }), { now })
    ).toBeNull();
  });

  it("wyłączona promocja i promocja bez progów nie obowiązują", () => {
    expect(activeQuantityPromo(promo({ active: false }), { now })).toBeNull();
    expect(activeQuantityPromo(promo({ tiers: [] }), { now })).toBeNull();
  });

  it("promocja wygasająca w czasie życia cache jest traktowana jak nieaktywna", () => {
    const konczy = promo({ endsAt: "2026-06-15T12:00:30Z" });
    expect(activeQuantityPromo(konczy, { now })).not.toBeNull();
    expect(activeQuantityPromo(konczy, { now, holdMs: 60_000 })).toBeNull();
  });
});

describe("zachęty", () => {
  it("podpowiada najbliższy lepszy próg", () => {
    const r = applyQuantityDiscount([item(100, 3)], promo());
    expect(r.percent).toBe(5);
    expect(r.nextTier?.tier.percent).toBe(10);
    expect(r.nextTier?.piecesMissing).toBe(2);
    expect(nextTierHintText(r.nextTier)).toBe("Dodaj jeszcze 2 sztuki, by zyskać −10%");
  });

  it("odmienia sztuki po polsku", () => {
    const jedna = applyQuantityDiscount([item(100, 2)], promo());
    expect(nextTierHintText(jedna.nextTier)).toBe("Dodaj jeszcze 1 sztukę, by zyskać −5%");
    const piec = applyQuantityDiscount(
      [item(100, 1)],
      promo({ tiers: [{ minPieces: 6, minValue: null, percent: 5 }] })
    );
    expect(nextTierHintText(piec.nextTier)).toBe("Dodaj jeszcze 5 sztuk, by zyskać −5%");
  });

  it("na najwyższym progu nie ma już czego podpowiadać", () => {
    const r = applyQuantityDiscount([item(100, 10)], promo());
    expect(r.nextTier).toBeNull();
    expect(nextTierHintText(r.nextTier)).toBeNull();
  });

  it("zachęta w katalogu opisuje najniższy próg", () => {
    expect(lowestTier(promo())?.minPieces).toBe(3);
    expect(quantityPromoTeaser(promo())).toBe("Kup 3 szt. i zyskaj −5%");
    expect(
      quantityPromoTeaser(promo({ tiers: [{ minPieces: 3, minValue: 400, percent: 10 }] }))
    ).toBe("Kup 3 szt. za min. 400,00 zł i zyskaj −10%");
  });
});

describe("walidacja z panelu", () => {
  const base = {
    name: "Wiosna",
    tiers: [{ minPieces: 3, percent: 5 }],
  };

  it("przyjmuje poprawną promocję i domyśla się ostrożnych ustawień", () => {
    const r = validateQuantityPromo(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.stackable).toBe(true);
      expect(r.data.includeDiscountedProducts).toBe(false); // ostrożny domyślny
      expect(r.data.minItemPrice).toBe(0);
      expect(r.data.maxDiscount).toBeNull();
    }
  });

  it("wymaga nazwy i co najmniej jednego progu", () => {
    expect(validateQuantityPromo({ ...base, name: "" }).ok).toBe(false);
    expect(validateQuantityPromo({ ...base, tiers: [] }).ok).toBe(false);
  });

  it("odrzuca progi, które nie rosną – klient nie może tracić na dołożeniu sztuki", () => {
    const r = validateQuantityPromo({
      ...base,
      tiers: [
        { minPieces: 3, percent: 10 },
        { minPieces: 5, percent: 5 },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("odrzuca próg poniżej 2 sztuk – to nie byłby rabat za wolumen", () => {
    expect(validateQuantityPromo({ ...base, tiers: [{ minPieces: 1, percent: 5 }] }).ok).toBe(
      false
    );
  });

  it("przycina rabat do dozwolonego maksimum", () => {
    expect(normalizeTiers([{ minPieces: 3, percent: 500 }])[0].percent).toBe(90);
  });

  it("odrzuca nieprawidłowe okno i limity", () => {
    expect(
      validateQuantityPromo({
        ...base,
        startsAt: "2026-07-01T00:00:00Z",
        endsAt: "2026-06-01T00:00:00Z",
      }).ok
    ).toBe(false);
    expect(validateQuantityPromo({ ...base, maxDiscount: -5 }).ok).toBe(false);
    expect(validateQuantityPromo({ ...base, minItemPrice: -1 }).ok).toBe(false);
  });
});
