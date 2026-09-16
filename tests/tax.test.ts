// Rozliczenie podatkowe (`lib/tax.ts`): tryby działalności, formy
// opodatkowania, VAT, składka zdrowotna, zaliczki narastająco.

import { describe, expect, it } from "vitest";
import {
  LINEAR_HEALTH_DEDUCTION_LIMIT,
  computeYear,
  dznQuarterLimit,
  lumpHealthMonthly,
  minHealthMonthly,
  parseTaxConfig,
  scaleTaxAnnual,
  splitVat,
  summarizeYear,
  type MonthInput,
  type TaxConfig,
} from "@/lib/tax";

const base: TaxConfig = {
  mode: "unregistered",
  form: "scale",
  lumpRate: 5.5,
  vatEnabled: false,
  vatRate: 23,
  zusSocialMonthly: 0,
  minWage: 4806,
  avgWage: 8549.18,
};

function month(mo: number, rev: number, ship = 0, extra: Partial<MonthInput> = {}): MonthInput {
  return { yr: 2026, mo, cnt: rev > 0 ? 1 : 0, rev, ship, costs: 0, high: false, ...extra };
}

describe("parseTaxConfig", () => {
  it("puste ustawienia → domyślna działalność nierejestrowana bez VAT", () => {
    const cfg = parseTaxConfig({});
    expect(cfg).toMatchObject({ mode: "unregistered", form: "scale", vatEnabled: false, vatRate: 23, lumpRate: 5.5, minWage: 4806 });
  });

  it("czyta wartości i klamruje śmieci", () => {
    const cfg = parseTaxConfig({
      tax_mode: "registered", tax_form: "lump", tax_lump_rate: "8,5", tax_vat_enabled: "true",
      tax_vat_rate: "999", tax_zus_social: "abc", dzn_min_wage: "100",
    });
    expect(cfg).toMatchObject({ mode: "registered", form: "lump", lumpRate: 8.5, vatEnabled: true, vatRate: 50, zusSocialMonthly: 0, minWage: 1000 });
    expect(parseTaxConfig({ tax_form: "cokolwiek" }).form).toBe("scale");
  });
});

describe("VAT", () => {
  it("splitVat rozbija brutto na netto i VAT", () => {
    expect(splitVat(123, { vatEnabled: true, vatRate: 23 })).toEqual({ net: 100, vat: 23 });
    expect(splitVat(123, { vatEnabled: false, vatRate: 23 })).toEqual({ net: 123, vat: 0 });
    expect(splitVat(100, { vatEnabled: true, vatRate: 0 })).toEqual({ net: 100, vat: 0 });
  });

  it("w tabeli przychód netto i VAT należny sumują się do brutto", () => {
    const [r] = computeYear([month(1, 246, 24.6)], { ...base, vatEnabled: true });
    expect(r.revNet).toBe(200);
    expect(r.vatDue).toBe(46);
    expect(r.shipNet).toBe(20);
    expect(r.productsNet).toBe(180);
    // DzN: PIT od produktów netto
    expect(r.pit).toBe(21.6);
  });
});

describe("działalność nierejestrowana", () => {
  it("12% od przychodu z produktów, 32% po zaznaczeniu, bez ZUS", () => {
    const rows = computeYear([month(1, 1018, 18), month(2, 1018, 18, { high: true }), month(3, 0)], base);
    expect(rows[0]).toMatchObject({ productsNet: 1000, pit: 120, health: 0, zusSocial: 0, rateLabel: "12%" });
    expect(rows[1]).toMatchObject({ pit: 320, rateLabel: "32%" });
    expect(rows[2].pit).toBe(0);
  });

  it("koszty są ignorowane – DzN rozlicza przychód", () => {
    const [r] = computeYear([month(1, 1000, 0, { costs: 900 })], base);
    expect(r.pit).toBe(120);
  });

  it("limit kwartalny = 225% płacy minimalnej", () => {
    expect(dznQuarterLimit(4806)).toBe(10813.5);
  });
});

describe("skala w działalności gospodarczej", () => {
  const cfg: TaxConfig = { ...base, mode: "registered", form: "scale" };

  it("scaleTaxAnnual: kwota wolna, próg 120 000", () => {
    expect(scaleTaxAnnual(0)).toBe(0);
    expect(scaleTaxAnnual(30_000)).toBe(0);
    expect(scaleTaxAnnual(100_000)).toBe(8400);
    expect(scaleTaxAnnual(200_000)).toBe(14400 - 3600 + 25600);
  });

  it("zaliczki narastająco: dopóki dochód mieści się w kwocie wolnej, PIT = 0", () => {
    const rows = computeYear([month(1, 10_000), month(2, 10_000), month(3, 10_000), month(4, 10_000)], cfg);
    expect(rows[0].pit).toBe(0);
    expect(rows[2].pit).toBe(0);
    // po 4 miesiącach dochód 40 000 (minus zdrowotna nie – skala jej nie odlicza): 12% × 40 000 − 3 600 = 1 200
    expect(rows[3].pit).toBe(1200);
    const sum = summarizeYear(rows);
    expect(sum.pit).toBe(scaleTaxAnnual(sum.base));
  });

  it("koszty i ZUS społeczne obniżają dochód; zdrowotna 9% z minimum", () => {
    const withZus: TaxConfig = { ...cfg, zusSocialMonthly: 500 };
    const [r] = computeYear([month(1, 5000, 0, { costs: 1500 })], withZus);
    expect(r.base).toBe(3000);
    expect(r.zusSocial).toBe(500);
    expect(r.health).toBe(minHealthMonthly(4806)); // 9% × 3000 = 270 < minimum 324,41
    expect(minHealthMonthly(4806)).toBe(324.4); // 4806 × 0,75 × 9% = 324,405 – zaokrąglenie float
    const [big] = computeYear([month(1, 20_000)], cfg);
    expect(big.health).toBe(1800);
  });

  it("miesiąc bez sprzedaży nie generuje składek", () => {
    const [r] = computeYear([month(1, 0)], { ...cfg, zusSocialMonthly: 500 });
    expect(r).toMatchObject({ zusSocial: 0, health: 0, pit: 0 });
  });

  it("strata nie daje ujemnego podatku, a obniża dochód narastająco", () => {
    const rows = computeYear([month(1, 1000, 0, { costs: 5000 }), month(2, 40_000)], cfg);
    expect(rows[0].pit).toBe(0);
    expect(rows[0].base).toBe(-4000);
    // narastająco 36 000 → 12% × 36 000 − 3 600 = 720
    expect(rows[1].pit).toBe(720);
  });

  it("powyżej 120 000 stawka 32% bez ręcznego checkboxa", () => {
    const rows = computeYear([month(1, 130_000), month(2, 10_000, 0, { high: false })], cfg);
    expect(rows[0].rateLabel).toBe("32%");
    expect(rows[1].pit).toBe(3200);
  });
});

describe("liniowy", () => {
  const cfg: TaxConfig = { ...base, mode: "registered", form: "linear" };

  it("19% od dochodu po odliczeniu składki zdrowotnej (4,9%)", () => {
    const [r] = computeYear([month(1, 20_000)], cfg);
    expect(r.health).toBe(980);
    expect(r.base).toBe(19_020);
    expect(r.pit).toBe(3613.8);
    expect(r.rateLabel).toBe("19%");
  });

  it("odliczenie zdrowotnej kończy się na rocznym limicie", () => {
    const months = Array.from({ length: 12 }, (_, i) => month(i + 1, 50_000));
    const rows = computeYear(months, cfg);
    const deducted = rows.reduce((s, r) => s + (r.productsNet - r.base), 0);
    expect(Math.round(deducted)).toBe(LINEAR_HEALTH_DEDUCTION_LIMIT);
  });
});

describe("ryczałt", () => {
  const cfg: TaxConfig = { ...base, mode: "registered", form: "lump", lumpRate: 5.5 };

  it("stawka od przychodu z wysyłką, koszty bez znaczenia, pół zdrowotnej odliczone", () => {
    const [r] = computeYear([month(1, 10_000, 500, { costs: 9000 })], cfg);
    const health = lumpHealthMonthly(10_000, 8549.18); // próg do 60 000 → 60% × 8549,18 × 9%
    expect(health).toBe(461.66);
    expect(r.health).toBe(health);
    expect(r.base).toBe(10_000 - 230.83);
    expect(r.pit).toBe(537.3);
    expect(r.rateLabel).toBe("5,5%");
  });

  it("składka zdrowotna rośnie po przekroczeniu progów przychodu", () => {
    expect(lumpHealthMonthly(59_000, 8549.18)).toBe(461.66);
    expect(lumpHealthMonthly(100_000, 8549.18)).toBe(769.43);
    expect(lumpHealthMonthly(400_000, 8549.18)).toBe(1384.97);
    const rows = computeYear([month(1, 50_000), month(2, 50_000)], cfg);
    expect(rows[0].health).toBe(461.66);
    expect(rows[1].health).toBe(769.43);
  });
});

describe("summarizeYear", () => {
  it("sumuje wszystkie kolumny", () => {
    const rows = computeYear([month(1, 1230, 123), month(2, 2460, 0)], { ...base, vatEnabled: true });
    const s = summarizeYear(rows);
    expect(s.rev).toBe(3690);
    expect(s.revNet).toBe(3000);
    expect(s.vatDue).toBe(690);
    expect(s.cnt).toBe(2);
    expect(s.pit).toBe(rows[0].pit + rows[1].pit);
  });
});
