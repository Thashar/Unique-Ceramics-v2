import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_OPTIONS,
  dimensionHints,
  matchByName,
  nameScore,
  priceOptions,
  productHints,
  type HintProduct,
} from "@/lib/product-hints";

const p = (name: string, price: number, dimensions: HintProduct["dimensions"] = {}): HintProduct => ({
  name,
  price,
  dimensions,
});

describe("dopasowanie po nazwie", () => {
  it("ten sam rodzaj przedmiotu wygrywa z samym kolorem", () => {
    expect(nameScore("Czarka czarna", "Czarka z żurawiem")).toBeGreaterThan(
      nameScore("Czarka czarna", "Kubek czarny")
    );
  });

  it("bierze tylko produkty naprawdę podobne", () => {
    const shop = [p("Czarka czarna matowa", 76), p("Czarka z żurawiem", 76), p("Wazon wysoki", 240)];
    expect(matchByName(shop, "Czarka czarna").map((x) => x.name)).toEqual([
      "Czarka czarna matowa",
      "Czarka z żurawiem",
    ]);
  });

  it("brak podobnych daje pustą listę, nie całą kategorię", () => {
    expect(matchByName([p("Wazon wysoki", 240)], "Czarka czarna")).toEqual([]);
  });
});

describe("ceny – nigdy wymyślone", () => {
  it("⚠️ nie liczy mediany: z 76 i 100 nie powstaje 88", () => {
    // Zgłoszenie 19.09.2026: agent proponował 88 zł, którego nie ma w sklepie
    const options = priceOptions([p("Czarka A", 76), p("Czarka B", 100)]);
    expect(options.map((o) => o.price)).toEqual([76, 100]);
    expect(options.map((o) => o.price)).not.toContain(88);
  });

  it("najczęstsza cena idzie pierwsza i niesie nazwy", () => {
    const options = priceOptions([p("Czarka A", 100), p("Czarka B", 76), p("Czarka C", 76)]);
    expect(options[0]).toEqual({ price: 76, count: 2, names: ["Czarka B", "Czarka C"] });
    expect(options[1].price).toBe(100);
  });

  it("jedna cena we wszystkich produktach daje jedną opcję", () => {
    expect(priceOptions([p("Czarka A", 76), p("Czarka B", 76)])).toEqual([
      { price: 76, count: 2, names: ["Czarka A", "Czarka B"] },
    ]);
  });

  it("pomija ceny zerowe i ujemne", () => {
    expect(priceOptions([p("Bez ceny", 0), p("Ujemna", -5), p("Czarka", 76)])).toEqual([
      { price: 76, count: 1, names: ["Czarka"] },
    ]);
  });

  it("nie zasypuje właściciela wariantami", () => {
    const many = [10, 20, 30, 40, 50, 60].map((v, i) => p(`Czarka ${i}`, v));
    expect(priceOptions(many)).toHaveLength(MAX_PRICE_OPTIONS);
  });
});

describe("wymiary z podobnych produktów", () => {
  it("podpowiada najczęstszą wartość", () => {
    const shop = [
      p("Czarka A", 76, { wysokosc: "9" }),
      p("Czarka B", 76, { wysokosc: "9" }),
      p("Czarka C", 76, { wysokosc: "7" }),
    ];
    expect(dimensionHints(shop, ["wysokosc"])).toEqual([{ id: "wysokosc", value: "9", count: 2 }]);
  });

  it("remis rozstrzyga mniejsza wartość", () => {
    const shop = [p("A", 1, { wysokosc: "12" }), p("B", 1, { wysokosc: "7" })];
    expect(dimensionHints(shop, ["wysokosc"])[0].value).toBe("7");
  });

  it("pomija wymiary spoza kategorii i te bez danych", () => {
    const shop = [p("A", 1, { wysokosc: "9", dlugosc: "18" })];
    expect(dimensionHints(shop, ["wysokosc", "pojemnosc"])).toEqual([
      { id: "wysokosc", value: "9", count: 1 },
    ]);
  });
});

describe("komplet podpowiedzi", () => {
  const shop = [
    p("Czarka czarna matowa", 76, { wysokosc: "7", pojemnosc: "200" }),
    p("Czarka z żurawiem", 76, { wysokosc: "7" }),
    p("Wazon wysoki", 240, { wysokosc: "30" }),
  ];

  it("ceny z dopasowanych, wymiary też", () => {
    const hints = productHints(shop, "Czarka czarna", ["wysokosc", "pojemnosc"]);
    expect(hints.prices).toEqual([{ price: 76, count: 2, names: ["Czarka czarna matowa", "Czarka z żurawiem"] }]);
    expect(hints.dimensions).toEqual([
      { id: "wysokosc", value: "7", count: 2 },
      { id: "pojemnosc", value: "200", count: 1 },
    ]);
    expect(hints).toMatchObject({ matched: 2, scanned: 3 });
  });

  it("bez dopasowania po nazwie: brak ceny, wymiary z całej kategorii", () => {
    const hints = productHints(shop, "Świecznik leśny", ["wysokosc"]);
    expect(hints.prices).toEqual([]);
    expect(hints.matched).toBe(0);
    expect(hints.dimensions[0].id).toBe("wysokosc");
  });

  it("pusta kategoria nie podpowiada niczego", () => {
    expect(productHints([], "Czarka", ["wysokosc"])).toEqual({
      prices: [],
      dimensions: [],
      matched: 0,
      scanned: 0,
    });
  });
});
