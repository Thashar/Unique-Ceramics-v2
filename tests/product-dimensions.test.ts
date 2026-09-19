import { describe, expect, it } from "vitest";
import {
  CAPACITY_ID,
  DEFAULT_CATEGORY_DIMENSIONS,
  DIMENSION_FIELDS,
  categoryDimensionsKey,
  describeDimensions,
  hasDimensions,
  isDimensionId,
  parseCategoryDimensions,
  parseProductDimensions,
  productDimensionsKey,
  serializeCategoryDimensions,
  serializeProductDimensions,
} from "@/lib/product-dimensions";
import { buildProductDescription } from "@/lib/product-description";

describe("pola wymiarów", () => {
  it("ma komplet pól, o które prosił właściciel", () => {
    expect(DIMENSION_FIELDS.map((f) => f.id)).toEqual([
      "wysokosc",
      "szerokosc",
      "dlugosc",
      "srednica-gorna",
      "pojemnosc",
    ]);
    expect(dimUnit("pojemnosc")).toBe("ml");
    expect(dimUnit("wysokosc")).toBe("cm");
  });

  it("rozpoznaje własne identyfikatory", () => {
    expect(isDimensionId("wysokosc")).toBe(true);
    expect(isDimensionId("glebokosc")).toBe(false);
  });

  it("buduje klucze ustawień", () => {
    expect(categoryDimensionsKey("abc")).toBe("category_dims_abc");
    expect(productDimensionsKey("abc")).toBe("product_dims_abc");
  });
});

function dimUnit(id: string) {
  return DIMENSION_FIELDS.find((f) => f.id === id)?.unit;
}

describe("wymiary kategorii", () => {
  it("brak wpisu wraca do domyślnych, pusta lista zostaje pusta", () => {
    expect(parseCategoryDimensions(undefined)).toEqual(DEFAULT_CATEGORY_DIMENSIONS);
    expect(parseCategoryDimensions("")).toEqual(DEFAULT_CATEGORY_DIMENSIONS);
    expect(parseCategoryDimensions("[]")).toEqual([]);
  });

  it("porządkuje wymiary wg listy pól i odrzuca nieznane", () => {
    expect(parseCategoryDimensions('["pojemnosc","wysokosc","glebokosc"]')).toEqual([
      "wysokosc",
      "pojemnosc",
    ]);
  });

  it("odrzuca duplikaty i uszkodzony JSON", () => {
    expect(parseCategoryDimensions('["wysokosc","wysokosc"]')).toEqual(["wysokosc"]);
    expect(parseCategoryDimensions("{nie json")).toEqual(DEFAULT_CATEGORY_DIMENSIONS);
  });

  it("zapis i odczyt dają to samo", () => {
    const ids = ["dlugosc", "wysokosc"] as const;
    expect(parseCategoryDimensions(serializeCategoryDimensions(ids))).toEqual(["wysokosc", "dlugosc"]);
  });
});

describe("wymiary produktu", () => {
  it("czyta wartości i pomija puste", () => {
    expect(parseProductDimensions('{"wysokosc":"9","szerokosc":"  ","pojemnosc":300}')).toEqual({
      wysokosc: "9",
      pojemnosc: "300",
    });
  });

  it("uszkodzony JSON i nie-obiekt dają pustkę", () => {
    expect(parseProductDimensions("[1,2]")).toEqual({});
    expect(parseProductDimensions("{nie json")).toEqual({});
    expect(parseProductDimensions(null)).toEqual({});
  });

  it("zapis pomija puste pola", () => {
    expect(serializeProductDimensions({ wysokosc: "9", dlugosc: "" })).toBe('{"wysokosc":"9"}');
  });

  it("mówi, czy cokolwiek wypełniono", () => {
    expect(hasDimensions({})).toBe(false);
    expect(hasDimensions({ wysokosc: " " })).toBe(false);
    expect(hasDimensions({ wysokosc: "9" })).toBe(true);
  });
});

describe("wymiary w opisie", () => {
  it("dokłada jednostki i wydziela pojemność", () => {
    const out = describeDimensions({ wysokosc: "9", "srednica-gorna": "8", pojemnosc: "300" });
    expect(out.dimensions).toEqual([
      { label: "wysokość", value: "ok. 9 cm" },
      { label: "średnica górna", value: "ok. 8 cm" },
    ]);
    expect(out.capacity).toBe("ok. 300 ml");
    expect(CAPACITY_ID).toBe("pojemnosc");
  });

  it("pokazuje wyłącznie wymiary używane przez kategorię", () => {
    const out = describeDimensions({ wysokosc: "9", dlugosc: "18" }, ["wysokosc"]);
    expect(out.dimensions).toEqual([{ label: "wysokość", value: "ok. 9 cm" }]);
  });

  it("składa ten sam układ opisu co dotąd", () => {
    const { dimensions, capacity } = describeDimensions({ wysokosc: "9", pojemnosc: "300" });
    expect(buildProductDescription({ description: "Czarka.", dimensions, capacity })).toBe(
      "Czarka.\n\nWymiary:\nwysokość: ok. 9 cm\n\nPojemność:\nok. 300 ml"
    );
  });

  it("puste wartości nie robią pustych wierszy", () => {
    expect(describeDimensions({})).toEqual({ dimensions: [], capacity: "" });
  });
});
