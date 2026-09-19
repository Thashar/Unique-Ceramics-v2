import { describe, expect, it } from "vitest";
import {
  DUPLICATE_MIN_CONFIDENCE,
  bestDuplicate,
  buildDuplicatePrompt,
  comparisonImage,
  hasConcreteMatch,
  isOffShelf,
  keywords,
  parseDuplicateVerdicts,
  pickDuplicateCandidates,
  textScore,
  type SimilarityProduct,
} from "@/lib/product-similarity";

const product = (over: Partial<SimilarityProduct> = {}): SimilarityProduct => ({
  id: "p1",
  slug: "kubek-z-zurawiem",
  name: "Kubek z żurawiem",
  description: "Kubek z wizerunkiem żurawia na froncie, szkliwo w odcieniu piasku.",
  images: ["https://x.supabase.co/storage/v1/object/public/images/a.webp"],
  stock: 0,
  active: true,
  ...over,
});

const isAi = (url: string) => url.endsWith("-ai.webp");

describe("keywords / textScore", () => {
  it("pomija wypełniacze i krótkie słowa", () => {
    const words = keywords("Ręcznie robiony ceramiczny kubek z żurawiem");
    expect(words.has("kubek")).toBe(true);
    expect(words.has("zurawiem")).toBe(true);
    expect(words.has("ceramiczny")).toBe(false);
    expect(words.has("z")).toBe(false);
  });

  it("wyżej punktuje pokrycie w nazwie niż w opisie", () => {
    const draft = { name: "Kubek z żurawiem", description: "Ptak na froncie." };
    const inName = textScore(draft, product());
    const inDescription = textScore(draft, product({ name: "Naczynie", description: "kubek z żurawiem" }));
    expect(inName).toBeGreaterThan(inDescription);
  });

  it("nie wywraca się na pustym rozpoznaniu", () => {
    expect(textScore({ name: "", description: "" }, product())).toBe(0);
  });
});

describe("pickDuplicateCandidates", () => {
  const draft = { name: "Kubek z żurawiem", description: "Ptak na froncie, piaskowe szkliwo." };

  it("bierze tylko oferty, których nie ma w sklepie", () => {
    const inShop = product({ id: "in-shop", stock: 3, active: true });
    const soldOut = product({ id: "sold-out", stock: 0, active: true });
    const hidden = product({ id: "hidden", stock: 5, active: false });
    const picked = pickDuplicateCandidates([inShop, soldOut, hidden], draft);
    expect(picked.map((p) => p.id)).toEqual(["sold-out", "hidden"]);
  });

  it("pomija oferty bez zdjęcia i przycina do limitu", () => {
    const withoutImage = product({ id: "no-image", images: [] });
    const rest = [1, 2, 3, 4].map((n) => product({ id: `p${n}` }));
    const picked = pickDuplicateCandidates([withoutImage, ...rest], draft, 3);
    expect(picked).toHaveLength(3);
    expect(picked.some((p) => p.id === "no-image")).toBe(false);
  });

  it("układa po pokryciu tekstu, a remis rozstrzyga kolejnością wejściową", () => {
    const weak = product({ id: "weak", name: "Miska", description: "Gładka miska." });
    const strong = product({ id: "strong" });
    const [first] = pickDuplicateCandidates([weak, strong], draft, 2);
    expect(first.id).toBe("strong");
  });

  it("pusta lista produktów daje pustą listę kandydatów", () => {
    expect(pickDuplicateCandidates([], draft)).toEqual([]);
  });
});

describe("comparisonImage", () => {
  it("woli oryginał sprzed AI", () => {
    const p = product({ images: ["x/scena-ai.webp", "x/oryginal.webp"] });
    expect(comparisonImage(p, isAi)).toBe("x/oryginal.webp");
  });

  it("bierze pierwsze zdjęcie, gdy wszystkie są z AI", () => {
    const p = product({ images: ["x/a-ai.webp", "x/b-ai.webp"] });
    expect(comparisonImage(p, isAi)).toBe("x/a-ai.webp");
  });
});

describe("parseDuplicateVerdicts", () => {
  it("czyta poprawne wiersze i przycina pewność do zakresu", () => {
    const rows = parseDuplicateVerdicts(
      { results: [{ index: 1, verdict: "ten_sam_wzor", confidence: 140, matched: "ten sam żuraw", differences: "inny odcień" }] },
      2
    );
    expect(rows).toEqual([
      { index: 1, verdict: "ten_sam_wzor", confidence: 100, matched: "ten sam żuraw", differences: "inny odcień" },
    ]);
  });

  it("odrzuca numery spoza zakresu, nieznane werdykty i śmieci", () => {
    const rows = parseDuplicateVerdicts(
      {
        results: [
          { index: 9, verdict: "ten_sam_wzor", confidence: 99 },
          { index: 1, verdict: "moze", confidence: 99 },
          null,
          "cokolwiek",
          { index: 2, verdict: "inny", confidence: 10 },
        ],
      },
      2
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ index: 2, verdict: "inny" });
  });

  it("brak tablicy wyników daje pustą listę", () => {
    expect(parseDuplicateVerdicts({ wynik: "brak" }, 3)).toEqual([]);
    expect(parseDuplicateVerdicts(null, 3)).toEqual([]);
  });
});

describe("hasConcreteMatch", () => {
  it("przyjmuje nazwane cechy", () => {
    expect(hasConcreteMatch("ten sam żuraw na froncie i to samo ucho")).toBe(true);
  });

  it("odrzuca ogólniki i puste", () => {
    expect(hasConcreteMatch("podobny styl")).toBe(false);
    expect(hasConcreteMatch("ta sama kolorystyka")).toBe(false);
    expect(hasConcreteMatch("")).toBe(false);
  });
});

describe("bestDuplicate", () => {
  const candidates = [product({ id: "a" }), product({ id: "b" })];
  const row = (over: Record<string, unknown> = {}) => ({
    index: 1,
    verdict: "ten_sam_wzor" as const,
    confidence: 90,
    matched: "ten sam żuraw na froncie",
    differences: "inny odcień szkliwa",
    ...over,
  });

  it("zwraca ofertę o najwyższej pewności", () => {
    const match = bestDuplicate([row(), row({ index: 2, confidence: 95 })], candidates);
    expect(match?.product.id).toBe("b");
  });

  it("nie proponuje niczego poniżej progu", () => {
    expect(bestDuplicate([row({ confidence: DUPLICATE_MIN_CONFIDENCE - 1 })], candidates)).toBeNull();
  });

  it("nie proponuje przy werdykcie „ta sama rodzina”", () => {
    expect(bestDuplicate([row({ verdict: "ta_sama_rodzina" })], candidates)).toBeNull();
  });

  it("nie proponuje bez nazwanych cech", () => {
    expect(bestDuplicate([row({ matched: "podobny styl" })], candidates)).toBeNull();
  });
});

describe("buildDuplicatePrompt", () => {
  it("numeruje oferty zgodnie z kolejnością zdjęć", () => {
    const prompt = buildDuplicatePrompt({ name: "Kubek z żurawiem", description: "" }, [
      product({ name: "Kubek z żurawiem" }),
      product({ name: "Miska z liściem" }),
    ]);
    expect(prompt).toContain("Oferta 1: Kubek z żurawiem");
    expect(prompt).toContain("Oferta 2: Miska z liściem");
    expect(prompt).toContain("Zdjęcie 1 to nowy przedmiot");
    expect(prompt).not.toMatch(/[—―]/);
  });
});

describe("isOffShelf", () => {
  it("wyprzedane i wyłączone są poza sklepem", () => {
    expect(isOffShelf(product({ stock: 0, active: true }))).toBe(true);
    expect(isOffShelf(product({ stock: 4, active: false }))).toBe(true);
    expect(isOffShelf(product({ stock: 4, active: true }))).toBe(false);
  });
});
