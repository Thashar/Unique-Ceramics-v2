// Testy wyceny zamówienia: rabat produktowy, rabat ilościowy, kody rabatowe,
// promocja „Darmowa wysyłka” i domykanie się podsumowania.
//
// Te moduły decydują o kwocie, którą płaci klient, i wchodzą ze sobą
// w interakcje (rabaty się sumują albo wykluczają, warianty konkurują o niższą
// kwotę). Każdy test pilnuje jednej reguły opisanej w CLAUDE.md.

import { describe, expect, it } from "vitest";
import {
  activeDiscountPercent,
  discountState,
  discountedPrice,
  isWithinWindow,
  normalizeDiscountPercent,
} from "@/lib/product-price";
import { normalizeCode, isValidCodeFormat, priceOrder } from "@/lib/discount-code";
import {
  activeFreeShipping,
  freeShippingMissing,
  isShippingFree,
  normalizeMethods,
  validateFreeShippingPromo,
  type FreeShippingConfig,
} from "@/lib/free-shipping";
import type { QuantityPromoConfig } from "@/lib/quantity-promo";
import { orderSummary } from "@/lib/order-summary";

/** Darmowa wysyłka od 300 zł, bezterminowo, obie metody. */
const freeFrom300: FreeShippingConfig = {
  name: "Od 300 zł",
  active: true,
  startsAt: null,
  endsAt: null,
  minOrderValue: 300,
  methods: ["courier", "parcel_locker"],
};

const shipping = {
  courier: 18,
  parcelLocker: 18,
  freeShipping: freeFrom300,
};

/** Rabat ilościowy: 3 szt → −10%. */
function qtyPromo(overrides: Partial<QuantityPromoConfig> = {}): QuantityPromoConfig {
  return {
    name: "Ilościowy",
    active: true,
    startsAt: null,
    endsAt: null,
    stackable: true,
    includeDiscountedProducts: false,
    minItemPrice: 0,
    maxDiscount: null,
    tiers: [{ minPieces: 3, minValue: null, percent: 10 }],
    ...overrides,
  };
}

describe("rabat produktowy", () => {
  it("obcina rabat do dozwolonego zakresu", () => {
    expect(normalizeDiscountPercent(150)).toBe(90);
    expect(normalizeDiscountPercent(-5)).toBe(0);
    expect(normalizeDiscountPercent("abc")).toBe(0);
    expect(normalizeDiscountPercent(20)).toBe(20);
  });

  it("liczy cenę po rabacie z dokładnością do grosza", () => {
    expect(discountedPrice(100, 20)).toBe(80);
    expect(discountedPrice(99.99, 33)).toBe(66.99);
    expect(discountedPrice(100, 0)).toBe(100);
  });

  it("nie stosuje rabatu poza oknem obowiązywania", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const okno = {
      discountPercent: 20,
      discountStartsAt: new Date("2026-06-01T00:00:00Z"),
      discountEndsAt: new Date("2026-06-30T00:00:00Z"),
    };
    expect(activeDiscountPercent(okno, { now })).toBe(20);
    expect(activeDiscountPercent(okno, { now: new Date("2026-05-01T00:00:00Z") })).toBe(0);
    expect(activeDiscountPercent(okno, { now: new Date("2026-07-01T00:00:00Z") })).toBe(0);
  });

  it("traktuje rabat wygasający w czasie życia cache jak nieaktywny", () => {
    // Zapisany HTML bywa serwowany do końca okna rewalidacji – nigdy nie wolno
    // pokazać ceny niższej niż ta, którą policzy checkout
    const now = new Date("2026-06-15T12:00:00Z");
    const product = { discountPercent: 20, discountEndsAt: new Date("2026-06-15T12:00:30Z") };
    expect(activeDiscountPercent(product, { now })).toBe(20);
    expect(activeDiscountPercent(product, { now, holdMs: 60_000 })).toBe(0);
  });

  it("rozpoznaje stan rabatu dla panelu", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    expect(discountState({ discountPercent: 0 }, now)).toBe("none");
    expect(
      discountState({ discountPercent: 10, discountStartsAt: "2026-07-01T00:00:00Z" }, now)
    ).toBe("scheduled");
    expect(
      discountState({ discountPercent: 10, discountEndsAt: "2026-06-01T00:00:00Z" }, now)
    ).toBe("expired");
    expect(discountState({ discountPercent: 10 }, now)).toBe("active");
  });

  it("okno bez ograniczeń obowiązuje zawsze", () => {
    expect(isWithinWindow(null, null)).toBe(true);
  });
});

describe("wysyłka", () => {
  const items = [{ price: 100, basePrice: 100, quantity: 1 }];

  it("odbiór osobisty jest bezpłatny", () => {
    const p = priceOrder({
      items,
      code: null,
      shipping: { method: "pickup", ...shipping },
    });
    expect(p.shippingCost).toBe(0);
    expect(p.total).toBe(100);
  });

  it("odbiór osobisty jest bezpłatny także przy rabacie ilościowym", () => {
    // Regresja po wycofanej promocji „Wielosztuki”, która pobierała narzut
    // również przy odbiorze, mimo etykiety „Bezpłatnie”
    const p = priceOrder({
      items: [{ price: 100, basePrice: 100, quantity: 3 }],
      quantityPromo: qtyPromo(),
      code: null,
      shipping: { method: "pickup", ...shipping },
    });
    expect(p.shippingCost).toBe(0);
    expect(p.total).toBe(270); // 3 × 90
  });

  it("kurier i paczkomat kosztują wg stawek", () => {
    const kurier = priceOrder({
      items,
      code: null,
      shipping: { method: "courier", courier: 18, parcelLocker: 12, freeShipping: null },
    });
    const paczkomat = priceOrder({
      items,
      code: null,
      shipping: { method: "parcel_locker", courier: 18, parcelLocker: 12, freeShipping: null },
    });
    expect(kurier.shippingCost).toBe(18);
    expect(paczkomat.shippingCost).toBe(12);
  });

  it("promocja darmowej wysyłki zeruje koszt po przekroczeniu progu", () => {
    const p = priceOrder({
      items: [{ price: 350, basePrice: 350, quantity: 1 }],
      code: null,
      shipping: { method: "courier", ...shipping },
    });
    expect(p.shippingCost).toBe(0);
    expect(p.shippingFree).toBe(true);
    expect(p.total).toBe(350);
  });

  it("próg darmowej wysyłki liczy się od kwoty PO rabatach", () => {
    // 320 zł przed rabatem, 288 zł po – progu 300 zł nie ma
    const p = priceOrder({
      items: [{ price: 288, basePrice: 320, quantity: 1 }],
      code: null,
      shipping: { method: "courier", ...shipping },
    });
    expect(p.shippingCost).toBe(18);
  });

  it("bez promocji wysyłka jest zawsze płatna", () => {
    const p = priceOrder({
      items: [{ price: 5000, basePrice: 5000, quantity: 1 }],
      code: null,
      shipping: { method: "courier", courier: 18, parcelLocker: 18, freeShipping: null },
    });
    expect(p.shippingCost).toBe(18);
  });
});

describe("promocja „Darmowa wysyłka”", () => {
  it("działa tylko dla wskazanych metod", () => {
    const tylkoPaczkomat: FreeShippingConfig = { ...freeFrom300, methods: ["parcel_locker"] };
    expect(isShippingFree(tylkoPaczkomat, "parcel_locker", 350)).toBe(true);
    expect(isShippingFree(tylkoPaczkomat, "courier", 350)).toBe(false);
  });

  it("próg zero oznacza darmową wysyłkę niezależnie od kwoty", () => {
    const bezProgu: FreeShippingConfig = { ...freeFrom300, minOrderValue: 0 };
    expect(isShippingFree(bezProgu, "courier", 1)).toBe(true);
  });

  it("podpowiada, ile brakuje do progu", () => {
    expect(freeShippingMissing(freeFrom300, "courier", 250)).toBe(50);
    expect(freeShippingMissing(freeFrom300, "courier", 350)).toBe(0);
    expect(freeShippingMissing(null, "courier", 10)).toBe(0);
  });

  it("nie obowiązuje poza oknem ani po wyłączeniu", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    expect(activeFreeShipping({ ...freeFrom300, active: false }, { now })).toBeNull();
    expect(
      activeFreeShipping({ ...freeFrom300, endsAt: "2026-06-01T00:00:00Z" }, { now })
    ).toBeNull();
    expect(activeFreeShipping({ ...freeFrom300, methods: [] }, { now })).toBeNull();
    expect(activeFreeShipping(freeFrom300, { now })).not.toBeNull();
  });

  it("odrzuca nieznane metody i waliduje dane z panelu", () => {
    expect(normalizeMethods(["courier", "smok", 5])).toEqual(["courier"]);
    expect(validateFreeShippingPromo({ name: "X", methods: [] }).ok).toBe(false);
    expect(validateFreeShippingPromo({ name: "", methods: ["courier"] }).ok).toBe(false);
    const ok = validateFreeShippingPromo({ name: "X", methods: ["courier"], minOrderValue: 0 });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.minOrderValue).toBe(0); // zero to poprawny próg
  });
});

describe("kody rabatowe", () => {
  it("normalizuje i sprawdza format kodu", () => {
    expect(normalizeCode("  lato-2026 ")).toBe("LATO-2026");
    expect(isValidCodeFormat("LATO-2026")).toBe(true);
    expect(isValidCodeFormat("AB")).toBe(false);
    expect(isValidCodeFormat("-LATO")).toBe(false);
  });

  it("kod łączony sumuje się z rabatem produktowym", () => {
    const p = priceOrder({
      items: [{ price: 80, basePrice: 100, quantity: 1 }], // przecena 20%
      code: { code: "LATO10", percent: 10, stackable: true },
      shipping: { method: "courier", ...shipping },
    });
    expect(p.variant).toBe("promo");
    expect(p.itemsTotal).toBe(72);
    expect(p.productDiscount).toBe(20);
    expect(p.codeDiscount).toBe(8);
    expect(p.total).toBe(90);
  });

  it("kod niełączony wchodzi tylko wtedy, gdy jest korzystniejszy", () => {
    const items = [{ price: 80, basePrice: 100, quantity: 1 }];
    const slaby = priceOrder({
      items,
      code: { code: "MALY", percent: 10, stackable: false },
      shipping: { method: "courier", ...shipping },
    });
    expect(slaby.appliedCode).toBeNull();
    expect(slaby.total).toBe(98);

    const mocny = priceOrder({
      items,
      code: { code: "MEGA", percent: 50, stackable: false },
      shipping: { method: "courier", ...shipping },
    });
    expect(mocny.variant).toBe("code");
    expect(mocny.appliedCode?.code).toBe("MEGA");
    expect(mocny.total).toBe(68);
  });
});

describe("łączenie rabatu ilościowego z kodem", () => {
  const items = [{ price: 100, basePrice: 100, quantity: 3 }];

  it("oba łączone – rabaty się sumują", () => {
    const p = priceOrder({
      items,
      quantityPromo: qtyPromo(),
      code: { code: "LATO10", percent: 10, stackable: true },
      shipping: { method: "courier", ...shipping },
    });
    expect(p.quantityPercent).toBe(10);
    expect(p.quantityDiscount).toBe(30); // 300 → 270
    expect(p.itemsTotal).toBe(243); // 270 → 243
    expect(p.codeDiscount).toBe(27);
    expect(p.appliedCode?.code).toBe("LATO10");
  });

  it("promocja niełączona z kodem – wygrywa wariant korzystniejszy dla klienta", () => {
    // Rabat ilościowy 10% jest lepszy niż kod 5%
    const slabyKod = priceOrder({
      items,
      quantityPromo: qtyPromo({ stackable: false }),
      code: { code: "MALY", percent: 5, stackable: true },
      shipping: { method: "courier", ...shipping },
    });
    expect(slabyKod.quantityPercent).toBe(10);
    expect(slabyKod.appliedCode).toBeNull();
    expect(slabyKod.itemsTotal).toBe(270);

    // Kod 30% jest lepszy niż rabat ilościowy 10%
    const mocnyKod = priceOrder({
      items,
      quantityPromo: qtyPromo({ stackable: false }),
      code: { code: "MEGA", percent: 30, stackable: true },
      shipping: { method: "courier", ...shipping },
    });
    expect(mocnyKod.quantityPercent).toBe(0);
    expect(mocnyKod.appliedCode?.code).toBe("MEGA");
    expect(mocnyKod.itemsTotal).toBe(210);
  });

  it("kod niełączony wyklucza rabat ilościowy i przecenę produktową", () => {
    const p = priceOrder({
      items: [{ price: 80, basePrice: 100, quantity: 3 }],
      quantityPromo: qtyPromo({ includeDiscountedProducts: true }),
      code: { code: "MEGA", percent: 50, stackable: false },
      shipping: { method: "courier", ...shipping },
    });
    expect(p.variant).toBe("code");
    expect(p.quantityPercent).toBe(0);
    expect(p.productDiscount).toBe(0);
    expect(p.itemsTotal).toBe(150); // 3 × (100 × 50%)
  });
});

describe("niezmienniki wyceny", () => {
  const warianty = [
    { nazwa: "bez rabatów", items: [{ price: 100, basePrice: 100, quantity: 1 }], q: null, code: null, method: "courier" as const },
    { nazwa: "przecena", items: [{ price: 80, basePrice: 100, quantity: 1 }], q: null, code: null, method: "courier" as const },
    { nazwa: "ilościowy", items: [{ price: 100, basePrice: 100, quantity: 3 }], q: qtyPromo(), code: null, method: "courier" as const },
    { nazwa: "ilościowy + odbiór", items: [{ price: 100, basePrice: 100, quantity: 3 }], q: qtyPromo(), code: null, method: "pickup" as const },
    { nazwa: "ilościowy + kod", items: [{ price: 100, basePrice: 100, quantity: 3 }], q: qtyPromo(), code: { code: "LATO10", percent: 10, stackable: true }, method: "courier" as const },
    { nazwa: "wszystko naraz", items: [{ price: 80, basePrice: 100, quantity: 2 }, { price: 45, basePrice: 45, quantity: 2 }], q: qtyPromo({ includeDiscountedProducts: true }), code: { code: "LATO10", percent: 10, stackable: true }, method: "courier" as const },
    { nazwa: "darmowa wysyłka", items: [{ price: 350, basePrice: 350, quantity: 1 }], q: null, code: null, method: "courier" as const },
    { nazwa: "grosze", items: [{ price: 33.33, basePrice: 33.33, quantity: 3 }, { price: 10.01, basePrice: 10.01, quantity: 1 }], q: qtyPromo(), code: null, method: "courier" as const },
  ];

  for (const w of warianty) {
    it(`kwota zamówienia zgadza się z pozycjami: ${w.nazwa}`, () => {
      const p = priceOrder({
        items: w.items,
        quantityPromo: w.q,
        code: w.code,
        shipping: { method: w.method, ...shipping },
      });
      // Zamówienie zapisuje ceny jednostkowe – suma musi trafić w `total`
      const zPozycji = p.items.reduce((s, l) => s + l.unitPrice * l.item.quantity, 0);
      expect(Math.round((zPozycji + p.shippingCost) * 100) / 100).toBe(p.total);
      // Rozbicie pokazywane klientowi też musi się domknąć
      expect(
        Math.round((p.display.catalogTotal - p.display.discountTotal) * 100) / 100
      ).toBe(p.itemsTotal);
      // Składniki upustu nie mogą przekraczać całości
      expect(
        Math.round((p.productDiscount + p.quantityDiscount + p.codeDiscount) * 100) / 100
      ).toBeCloseTo(p.display.discountTotal, 2);
    });

    it(`podsumowanie zamówienia domyka się: ${w.nazwa}`, () => {
      const p = priceOrder({
        items: w.items,
        quantityPromo: w.q,
        code: w.code,
        shipping: { method: w.method, ...shipping },
      });
      // Tak zamówienie zapisuje /api/checkout
      const view = orderSummary({
        items: p.items.map((l, i) => ({
          id: `i${i}`,
          price: l.unitPrice,
          basePrice: l.item.basePrice,
          quantity: l.item.quantity,
        })),
        shippingCost: p.shippingCost,
        total: p.total,
        shippingMethod: w.method,
        bundleSurcharge: null,
        discountCode: p.appliedCode?.code ?? null,
        discountAmount: p.codeDiscount > 0 ? p.codeDiscount : null,
        quantityDiscountPercent: p.quantityPercent || null,
        quantityDiscountAmount: p.quantityDiscount > 0 ? p.quantityDiscount : null,
      });
      const kolumna =
        Math.round((view.catalogTotal - view.discountTotal + view.shippingShown) * 100) / 100;
      expect(kolumna).toBe(view.total);
    });
  }
});

describe("archiwalne zamówienia", () => {
  it("zamówienie z wycofanej promocji „Wielosztuki” nadal się domyka", () => {
    const view = orderSummary({
      items: [{ id: "a", price: 100, basePrice: 100, quantity: 3 }],
      shippingCost: 18,
      total: 318,
      shippingMethod: "courier",
      bundleSurcharge: 18,
      discountCode: null,
      discountAmount: null,
    });
    expect(view.bundleApplied).toBe(true);
    expect(view.shippingLabel).toBe("bundled");
    expect(view.catalogTotal - view.discountTotal + view.shippingShown).toBe(view.total);
  });

  it("stare zamówienie bez basePrice nadal się domyka", () => {
    const view = orderSummary({
      items: [{ id: "a", price: 72, basePrice: null, quantity: 1 }],
      shippingCost: 18,
      total: 90,
      shippingMethod: "courier",
      bundleSurcharge: null,
      discountCode: "LATO10",
      discountAmount: 8,
    });
    expect(view.catalogTotal - view.discountTotal + view.shippingShown).toBe(view.total);
  });
});
