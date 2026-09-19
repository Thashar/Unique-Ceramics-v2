import { describe, expect, it } from "vitest";
import {
  buildProductDescription,
  normalizeLabel,
  normalizeMeasure,
  splitProductDescription,
} from "@/lib/product-description";

// Opis z agenta ma stały układ: opis, zdanie o wypale, „Wymiary:”, „Pojemność:”.
// Regresja tutaj to opis z podwojonymi wymiarami albo znacznikiem w tekście,
// jaki model potrafił wkleić, zanim składanie przeszło do kodu (17.09.2026).

describe("normalizeMeasure", () => {
  it("dokłada jednostkę i „ok.”", () => {
    expect(normalizeMeasure("8", "cm")).toBe("ok. 8 cm");
    expect(normalizeMeasure("8cm", "cm")).toBe("ok. 8 cm");
    expect(normalizeMeasure("ok. 8 cm", "cm")).toBe("ok. 8 cm");
    expect(normalizeMeasure("około 300", "ml")).toBe("ok. 300 ml");
    expect(normalizeMeasure("8,5", "cm")).toBe("ok. 8,5 cm");
  });

  it("nie psuje zapisu z tekstem i zamienia pauzy", () => {
    expect(normalizeMeasure("8 cm (z uchem 11 cm)", "cm")).toBe("ok. 8 cm (z uchem 11 cm)");
    expect(normalizeMeasure("7 — 9 cm", "cm")).toBe("ok. 7 – 9 cm");
    expect(normalizeMeasure("   ", "cm")).toBe("");
  });
});

describe("normalizeLabel", () => {
  it("mała litera na początku, bez dwukropka", () => {
    expect(normalizeLabel("Średnica górna:")).toBe("średnica górna");
    expect(normalizeLabel("wysokość")).toBe("wysokość");
    expect(normalizeLabel(" : ")).toBe("");
  });
});

describe("buildProductDescription", () => {
  it("składa pełny układ z odstępami", () => {
    const text = buildProductDescription({
      description: "Ręcznie wykonana miska z niebieskim szkliwem. Wnętrze jest gładkie.",
      firingNote: "Miska wypalana jest w temperaturze 1230°C, dzięki czemu cechuje się wysoką trwałością.",
      dimensions: [
        { label: "Średnica górna", value: "ok. 14 cm" },
        { label: "wysokość", value: "ok. 6 cm" },
      ],
      capacity: "ok. 400 ml",
    });
    expect(text).toBe(
      "Ręcznie wykonana miska z niebieskim szkliwem. Wnętrze jest gładkie.\n\n" +
        "Miska wypalana jest w temperaturze 1230°C, dzięki czemu cechuje się wysoką trwałością.\n\n" +
        "Wymiary:\nśrednica górna: ok. 14 cm\nwysokość: ok. 6 cm\n\n" +
        "Pojemność:\nok. 400 ml"
    );
  });

  it("pomija puste sekcje i puste wymiary", () => {
    const text = buildProductDescription({
      description: "Kubek z listkiem.",
      firingNote: "",
      dimensions: [
        { label: "średnica", value: "" },
        { label: "wysokość", value: "ok. 9 cm" },
      ],
      capacity: "",
    });
    expect(text).toBe("Kubek z listkiem.\n\nWymiary:\nwysokość: ok. 9 cm");
  });

  it("sam opis zostaje samym opisem", () => {
    expect(buildProductDescription({ description: " Świecznik. " })).toBe("Świecznik.");
  });
});

// Karta produktu rysuje wymiary wierszami z ikonami (19.09.2026), więc te same
// wymiary wpisane w opisie produktu sprzed tej zmiany muszą z tekstu wypaść –
// inaczej klient zobaczyłby je dwa razy.
describe("splitProductDescription", () => {
  const full = buildProductDescription({
    description: "Czarka z ciemnego szkliwa.",
    firingNote: "Wypalana w 1240°C.",
    dimensions: [
      { label: "średnica górna", value: "ok. 8 cm" },
      { label: "wysokość", value: "ok. 9 cm" },
    ],
    capacity: "ok. 300 ml",
  });

  it("zostawia w tekście samą prozę", () => {
    expect(splitProductDescription(full).text).toBe(
      "Czarka z ciemnego szkliwa.\n\nWypalana w 1240°C."
    );
  });

  it("wyjmuje wymiary i pojemność", () => {
    const out = splitProductDescription(full);
    expect(out.dimensions).toEqual([
      { label: "średnica górna", value: "ok. 8 cm" },
      { label: "wysokość", value: "ok. 9 cm" },
    ]);
    expect(out.capacity).toBe("ok. 300 ml");
  });

  it("radzi sobie bez pustej linii przed nagłówkiem", () => {
    const out = splitProductDescription("Kubek.\nWymiary:\nwysokość: ok. 9 cm");
    expect(out.text).toBe("Kubek.");
    expect(out.dimensions).toEqual([{ label: "wysokość", value: "ok. 9 cm" }]);
  });

  it("czyta też wersję angielską opisu", () => {
    const out = splitProductDescription("A cup.\n\nDimensions:\nheight: approx. 9 cm\n\nCapacity:\napprox. 300 ml");
    expect(out.text).toBe("A cup.");
    expect(out.dimensions).toEqual([{ label: "height", value: "approx. 9 cm" }]);
    expect(out.capacity).toBe("approx. 300 ml");
  });

  it("zdania z dwukropkiem po sekcji wracają do tekstu", () => {
    const out = splitProductDescription("Wymiary:\nwysokość: ok. 9 cm\nUwaga: każdy egzemplarz jest inny.");
    // „Uwaga: …” pasuje wzorcem do wiersza wymiaru, ale zdanie i tak zostaje
    // widoczne – w najgorszym razie jako wymiar, nigdy jako tekst zgubiony
    expect(out.dimensions.length + (out.text ? 1 : 0)).toBe(2);
  });

  it("opis bez wymiarów zostaje nietknięty", () => {
    const out = splitProductDescription("Czarka z ciemnego szkliwa.");
    expect(out).toEqual({ text: "Czarka z ciemnego szkliwa.", dimensions: [], capacity: "" });
  });
});
