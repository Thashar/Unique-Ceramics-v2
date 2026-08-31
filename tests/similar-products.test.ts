import { describe, expect, it } from "vitest";
import {
  SIMILAR_LIMIT,
  similarProducts,
  similarityScore,
  type SimilarProduct,
} from "@/lib/similar-products";

function product(overrides: Partial<SimilarProduct> & { slug: string }): SimilarProduct {
  return {
    id: overrides.slug,
    name: overrides.slug,
    category: "kubki",
    price: 100,
    images: [],
    stock: 5,
    featured: false,
    ...overrides,
  };
}

const current = product({ slug: "kubek-oglądany", category: "kubki", price: 100 });

describe("similarProducts", () => {
  it("nie pokazuje oglądanego produktu", () => {
    const result = similarProducts([current, product({ slug: "inny" })], current);
    expect(result.map((p) => p.slug)).toEqual(["inny"]);
  });

  it("pomija wyprzedane – karuzela prowadzi tylko do rzeczy dostępnych", () => {
    const result = similarProducts(
      [product({ slug: "dostepny" }), product({ slug: "wyprzedany", stock: 0 })],
      current
    );
    expect(result.map((p) => p.slug)).toEqual(["dostepny"]);
  });

  it("stawia produkty z tej samej kategorii przed resztą katalogu", () => {
    const result = similarProducts(
      [
        product({ slug: "z-innej", category: "miski", price: 100, featured: true }),
        product({ slug: "z-tej-samej", category: "kubki", price: 400 }),
      ],
      current
    );
    expect(result[0].slug).toBe("z-tej-samej");
  });

  it("przy tej samej kategorii wyżej stawia zbliżoną cenę", () => {
    const result = similarProducts(
      [
        product({ slug: "drogi", price: 400 }),
        product({ slug: "podobna-cena", price: 110 }),
      ],
      current
    );
    expect(result[0].slug).toBe("podobna-cena");
  });

  it("dopełnia listę z innych kategorii, gdy w swojej nie ma nikogo", () => {
    // Połowa kategorii sklepu ma jeden produkt – bez dopełniania sekcja byłaby pusta
    const solo = product({ slug: "dzbanek", category: "dzbanki" });
    const result = similarProducts(
      [solo, product({ slug: "kubek-a" }), product({ slug: "kubek-b" })],
      solo
    );
    expect(result).toHaveLength(2);
  });

  it("przycina do limitu", () => {
    const many = Array.from({ length: SIMILAR_LIMIT + 5 }, (_, i) =>
      product({ slug: `p-${i}` })
    );
    expect(similarProducts(many, current)).toHaveLength(SIMILAR_LIMIT);
  });

  it("daje zawsze tę samą kolejność dla tych samych danych (ISR nie może migotać)", () => {
    const catalog = Array.from({ length: 6 }, (_, i) => product({ slug: `p-${i}` }));
    const first = similarProducts(catalog, current).map((p) => p.slug);
    const second = similarProducts([...catalog].reverse(), current).map((p) => p.slug);
    expect(second).toEqual(first);
  });

  it("remis rozstrzyga bez trzymania się kolejności katalogu", () => {
    // Same punkty (kategoria, cena, brak wyróżnień) są identyczne – o kolejności
    // decyduje stabilny szum, nie pozycja na liście
    const catalog = Array.from({ length: 8 }, (_, i) => product({ slug: `p-${i}` }));
    const order = similarProducts(catalog, current, { limit: 8 }).map((p) => p.slug);
    expect(order).not.toEqual(catalog.map((p) => p.slug));
  });
});

describe("similarityScore", () => {
  it("premiuje wyróżnienie i trwającą przecenę", () => {
    const plain = product({ slug: "zwykly" });
    const base = similarityScore(current, plain);
    expect(similarityScore(current, { ...plain, featured: true })).toBeGreaterThan(base);
    expect(similarityScore(current, plain, { discounted: true })).toBeGreaterThan(base);
  });

  it("różnica punktów kategorii przebija wszystkie pozostałe premie razem", () => {
    const sameCategory = product({ slug: "a", category: "kubki", price: 400 });
    const other = product({ slug: "b", category: "miski", price: 100, featured: true });
    expect(similarityScore(current, sameCategory)).toBeGreaterThan(
      similarityScore(current, other, { discounted: true })
    );
  });
});
