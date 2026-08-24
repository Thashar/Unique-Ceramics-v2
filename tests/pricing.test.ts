// Testy wyceny zamówienia: rabat produktowy, promocja „Wielosztuki” i kody.
//
// Te trzy moduły decydują o kwocie, którą płaci klient, i wchodzą ze sobą
// w interakcje (rabaty się sumują albo wykluczają, narzut na wysyłkę rozkłada
// się na sztuki, reszta z zaokrągleń ląduje na ostatniej pozycji). Każdy test
// pilnuje jednej reguły opisanej w CLAUDE.md.

import { describe, expect, it } from "vitest";
import {
  activeDiscountPercent,
  discountState,
  discountedPrice,
  normalizeDiscountPercent,
} from "@/lib/product-price";
import { bundleFromSettings, bundleSummary, BUNDLE_OFF } from "@/lib/bundled-shipping";
import { normalizeCode, isValidCodeFormat, priceOrder } from "@/lib/discount-code";
import { orderSummary } from "@/lib/order-summary";

const shipping = {
  courier: 18,
  parcelLocker: 18,
  freeEnabled: true,
  freeFrom: 300,
};

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
});

describe("promocja Wielosztuki", () => {
  it("bierze wyższy z kosztów wysyłki jako narzut", () => {
    expect(
      bundleFromSettings({
        bundled_shipping_enabled: "true",
        shipping_cost: "18",
        shipping_cost_parcel_locker: "12",
      })
    ).toEqual({ enabled: true, surcharge: 18 });
  });

  it("zerowy narzut wyłącza promocję", () => {
    expect(
      bundleFromSettings({
        bundled_shipping_enabled: "true",
        shipping_cost: "0",
        shipping_cost_parcel_locker: "0",
      })
    ).toEqual(BUNDLE_OFF);
  });

  it("oddaje nadmiarowe narzuty jako rabat na każdej sztuce", () => {
    const s = bundleSummary([{ price: 100, quantity: 3 }], { enabled: true, surcharge: 18 });
    expect(s.catalogTotal).toBe(354); // 3 × (100 + 18)
    expect(s.total).toBe(318); // 3 × 100 + jedna wysyłka
    expect(s.discountTotal).toBe(36);
    // Rabat dostaje także pierwsza sztuka
    expect(s.lines[0].unitPrice).toBe(106);
  });

  it("suma pozycji zgadza się z kwotą zamówienia mimo zaokrągleń", () => {
    const s = bundleSummary(
      [
        { price: 33.33, quantity: 3 },
        { price: 10.01, quantity: 1 },
      ],
      { enabled: true, surcharge: 18 }
    );
    const suma = Math.round(s.lines.reduce((a, l) => a + l.lineTotal, 0) * 100) / 100;
    expect(suma).toBe(s.total);
  });
});

describe("wysyłka", () => {
  it("odbiór osobisty jest bezpłatny także przy promocji Wielosztuki", () => {
    // Regresja: promocja pobierała narzut również przy odbiorze osobistym,
    // a sklep pisał przy nim „Bezpłatnie”
    const items = [{ price: 100, basePrice: 100, quantity: 1 }];
    const bundle = { enabled: true, surcharge: 18 };

    const odbior = priceOrder({
      items,
      bundle,
      code: null,
      shipping: { method: "pickup", ...shipping },
    });
    expect(odbior.shippingCost).toBe(0);
    expect(odbior.total).toBe(100);

    const kurier = priceOrder({
      items,
      bundle,
      code: null,
      shipping: { method: "courier", ...shipping },
    });
    expect(kurier.total).toBe(118);
  });

  it("darmowa wysyłka od progu działa bez promocji", () => {
    const p = priceOrder({
      items: [{ price: 350, basePrice: 350, quantity: 1 }],
      bundle: BUNDLE_OFF,
      code: null,
      shipping: { method: "courier", ...shipping },
    });
    expect(p.shippingCost).toBe(0);
    expect(p.total).toBe(350);
  });

  it("próg darmowej wysyłki liczy się od cen po rabacie", () => {
    // 320 zł przed rabatem, 288 zł po – próg 300 zł nie jest osiągnięty
    const p = priceOrder({
      items: [{ price: 288, basePrice: 320, quantity: 1 }],
      bundle: BUNDLE_OFF,
      code: null,
      shipping: { method: "courier", ...shipping },
    });
    expect(p.shippingCost).toBe(18);
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
      items: [{ price: 80, basePrice: 100, quantity: 1 }], // rabat produktowy 20%
      bundle: BUNDLE_OFF,
      code: { code: "LATO10", percent: 10, stackable: true },
      shipping: { method: "courier", ...shipping },
    });
    expect(p.variant).toBe("promo");
    expect(p.itemsTotal).toBe(72); // 100 → 80 → 72
    expect(p.codeDiscount).toBe(8);
    expect(p.total).toBe(90);
  });

  it("kod niełączony wchodzi tylko wtedy, gdy jest korzystniejszy", () => {
    const items = [{ price: 80, basePrice: 100, quantity: 1 }];

    const slaby = priceOrder({
      items,
      bundle: BUNDLE_OFF,
      code: { code: "MALY", percent: 10, stackable: false },
      shipping: { method: "courier", ...shipping },
    });
    // 10% od ceny bazowej (90 zł) jest gorsze niż rabat produktowy 20% (80 zł)
    expect(slaby.appliedCode).toBeNull();
    expect(slaby.total).toBe(98);

    const mocny = priceOrder({
      items,
      bundle: BUNDLE_OFF,
      code: { code: "MEGA", percent: 50, stackable: false },
      shipping: { method: "courier", ...shipping },
    });
    expect(mocny.variant).toBe("code");
    expect(mocny.appliedCode?.code).toBe("MEGA");
    expect(mocny.total).toBe(68); // 50 zł + 18 zł
  });

  it("kod niełączony wyklucza promocję Wielosztuki", () => {
    const p = priceOrder({
      items: [{ price: 100, basePrice: 100, quantity: 1 }],
      bundle: { enabled: true, surcharge: 18 },
      code: { code: "MEGA", percent: 50, stackable: false },
      shipping: { method: "courier", ...shipping },
    });
    expect(p.variant).toBe("code");
    expect(p.bundle).toEqual(BUNDLE_OFF);
    expect(p.total).toBe(68); // 50 zł + zwykła wysyłka 18 zł
  });
});

describe("podsumowanie złożonego zamówienia", () => {
  // Regresja: wiersz „Kod rabatowy −X zł” odejmował kwotę, która siedziała już
  // w cenach pozycji, więc kolumna nie sumowała się do kwoty zapłaconej
  const warianty = [
    {
      nazwa: "bez rabatów",
      items: [{ price: 100, basePrice: 100, quantity: 1 }],
      bundle: BUNDLE_OFF,
      code: null,
      method: "courier" as const,
    },
    {
      nazwa: "rabat produktowy",
      items: [{ price: 80, basePrice: 100, quantity: 1 }],
      bundle: BUNDLE_OFF,
      code: null,
      method: "courier" as const,
    },
    {
      nazwa: "rabat + kod",
      items: [{ price: 80, basePrice: 100, quantity: 1 }],
      bundle: BUNDLE_OFF,
      code: { code: "LATO10", percent: 10, stackable: true },
      method: "courier" as const,
    },
    {
      nazwa: "wielosztuki",
      items: [{ price: 100, basePrice: 100, quantity: 3 }],
      bundle: { enabled: true, surcharge: 18 },
      code: null,
      method: "courier" as const,
    },
    {
      nazwa: "wielosztuki + odbiór osobisty",
      items: [{ price: 100, basePrice: 100, quantity: 3 }],
      bundle: { enabled: true, surcharge: 18 },
      code: null,
      method: "pickup" as const,
    },
    {
      nazwa: "wszystko naraz",
      items: [
        { price: 80, basePrice: 100, quantity: 2 },
        { price: 45, basePrice: 45, quantity: 1 },
      ],
      bundle: { enabled: true, surcharge: 18 },
      code: { code: "LATO10", percent: 10, stackable: true },
      method: "courier" as const,
    },
  ];

  for (const w of warianty) {
    it(`kolumna domyka się: ${w.nazwa}`, () => {
      const p = priceOrder({
        items: w.items,
        bundle: w.bundle,
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
        bundleSurcharge: p.bundle.enabled ? p.bundle.surcharge : null,
        discountCode: p.appliedCode?.code ?? null,
        discountAmount: p.codeDiscount > 0 ? p.codeDiscount : null,
      });

      const kolumna =
        Math.round((view.catalogTotal - view.discountTotal + view.shippingShown) * 100) / 100;
      expect(kolumna).toBe(view.total);

      const pozycje = Math.round(view.lines.reduce((a, l) => a + l.lineTotal, 0) * 100) / 100;
      expect(pozycje).toBe(Math.round((view.total - view.shippingShown) * 100) / 100);
    });
  }

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
