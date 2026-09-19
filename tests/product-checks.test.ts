import { describe, expect, it } from "vitest";
import {
  PRODUCT_STEPS,
  checkProduct,
  dictatedName,
  errorsOf,
  isStepId,
  repairProduct,
  stepLabel,
  type ProductCheckInput,
} from "@/lib/product-checks";
import { PRODUCT_MAX_IMAGES } from "@/lib/product-validation";

const input = (over: Partial<ProductCheckInput> = {}): ProductCheckInput => ({
  name: "Czarka z żurawiem",
  slug: "czarka-z-zurawiem",
  description: "Ręcznie toczona czarka.\n\nWymiary:\nśrednica: ok. 8 cm",
  price: 85,
  stock: 2,
  images: ["a.webp", "b.webp"],
  active: true,
  examples: ["Miska ramenowa", "Miska na sałatki"],
  dimensions: [{ label: "średnica", value: "ok. 8 cm" }],
  english: { name: "Crane teacup", description: "Hand-thrown teacup." },
  ...over,
});

const messages = (i: ReturnType<typeof checkProduct>) => i.map((x) => x.message).join(" | ");

describe("kroki przebiegu", () => {
  it("zna swoje identyfikatory i etykiety", () => {
    expect(isStepId("cena")).toBe(true);
    expect(isStepId("cokolwiek")).toBe(false);
    expect(stepLabel("sztuki")).toBe("liczba sztuk");
    expect(PRODUCT_STEPS.map((s) => s.id)).toContain("kategoria");
  });
});

describe("repairProduct", () => {
  it("przycina spacje i odtwarza slug z nazwy", () => {
    const { input: fixed, fixes } = repairProduct(input({ name: "  Czarka   z żurawiem ", slug: "Zła Nazwa!" }));
    expect(fixed.name).toBe("Czarka z żurawiem");
    expect(fixed.slug).toBe("czarka-z-zurawiem");
    expect(fixes.length).toBe(2);
  });

  it("usuwa powtórzone zdjęcia, zachowując kolejność", () => {
    const { input: fixed, fixes } = repairProduct(input({ images: ["a.webp", "b.webp", "a.webp", " "] }));
    expect(fixed.images).toEqual(["a.webp", "b.webp"]);
    expect(fixes.join()).toContain("powtórzone");
  });

  it("przycina listę zdjęć do limitu karty", () => {
    const many = Array.from({ length: PRODUCT_MAX_IMAGES + 3 }, (_, i) => `z${i}.webp`);
    const { input: fixed } = repairProduct(input({ images: many }));
    expect(fixed.images).toHaveLength(PRODUCT_MAX_IMAGES);
  });

  it("poprawna karta zostaje bez zmian", () => {
    const { fixes } = repairProduct(input());
    expect(fixes).toEqual([]);
  });
});

describe("checkProduct – błędy zatrzymujące zapis", () => {
  it("poprawna karta nie ma błędów", () => {
    expect(errorsOf(checkProduct(input()))).toEqual([]);
  });

  it("nazwa przepisana z produktu wzorcowego", () => {
    const issues = errorsOf(checkProduct(input({ name: "miska  RAMENOWA" })));
    expect(messages(issues)).toContain("taka sama jak istniejący produkt");
    expect(issues[0].step).toBe("nazwa");
  });

  it("wymiary wklejone dwa razy", () => {
    const issues = errorsOf(checkProduct(input({ description: "Opis.\n\nWymiary:\na\n\nWymiary:\nb" })));
    expect(messages(issues)).toContain("Wymiary:");
    expect(issues[0].step).toBe("wymiary");
  });

  it("znacznik zostawiony przez model", () => {
    const issues = errorsOf(checkProduct(input({ description: "Czarka {wymiary} w szkliwie." })));
    expect(messages(issues)).toContain("znacznik");
  });

  it("długi myślnik w treści", () => {
    expect(messages(errorsOf(checkProduct(input({ name: "Czarka — jasna" }))))).toContain("długi myślnik");
  });

  it("aktywny produkt bez ceny wskazuje krok ceny", () => {
    const issues = errorsOf(checkProduct(input({ price: 0, active: true })));
    const blocking = issues.find((i) => i.message.includes("aktywny"));
    expect(blocking?.step).toBe("cena");
  });

  it("aktywny produkt bez sztuk wskazuje krok sztuk", () => {
    const issues = errorsOf(checkProduct(input({ stock: 0, active: true })));
    expect(issues.find((i) => i.message.includes("aktywny"))?.step).toBe("sztuki");
  });

  it("karta bez zdjęć i bez nazwy", () => {
    const issues = errorsOf(checkProduct(input({ images: [], name: "", slug: "" })));
    expect(messages(issues)).toContain("ani jednego zdjęcia");
    expect(messages(issues)).toContain("nie ma nazwy");
  });
});

describe("checkProduct – ostrzeżenia", () => {
  it("nie zatrzymują zapisu", () => {
    const issues = checkProduct(input({ price: 0, stock: 0, active: false, english: null }));
    expect(errorsOf(issues)).toEqual([]);
    expect(messages(issues)).toContain("Cena jest zerowa");
    expect(messages(issues)).toContain("angielska");
  });

  it("wszystkie wymiary pominięte", () => {
    const issues = checkProduct(input({ dimensions: [{ label: "średnica", value: "" }] }));
    expect(messages(issues)).toContain("Żaden wymiar");
  });
});

describe("dictatedName", () => {
  it("bierze nazwę z polecenia właściciela dosłownie", () => {
    // Zgłoszenie 19.09.2026: agent zapisał „Czarka czarka ciemna z jasnym dnem”
    expect(dictatedName("Zmień nazwę na Czarka czarna")).toBe("Czarka czarna");
    expect(dictatedName("zmien nazwe na Czarka czarna")).toBe("Czarka czarna");
    expect(dictatedName("Zmień tytuł produktu na Kubek z kotem")).toBe("Kubek z kotem");
    expect(dictatedName("Nazwa: Czarka czarna")).toBe("Czarka czarna");
    expect(dictatedName("Nazwa produktu to Czarka czarna")).toBe("Czarka czarna");
    expect(dictatedName("Nazwij to Czarka czarna")).toBe("Czarka czarna");
    expect(dictatedName("Ma się nazywać Czarka czarna")).toBe("Czarka czarna");
  });

  it("zdejmuje cudzysłowy i kropkę kończącą zdanie", () => {
    expect(dictatedName('Zmień nazwę na "Czarka czarna".')).toBe("Czarka czarna");
    expect(dictatedName("Zmień nazwę na „Czarka czarna”")).toBe("Czarka czarna");
  });

  it("zostawia wielkość liter i znaki wewnątrz nazwy", () => {
    expect(dictatedName("Zmień nazwę na Czarka czarna – seria nocna")).toBe("Czarka czarna – seria nocna");
    expect(dictatedName("ustaw nazwę na miska ażurowa")).toBe("miska ażurowa");
  });

  it("nie bierze polecenia za nazwę", () => {
    expect(dictatedName("Zmień nazwę na coś krótszego")).toBe("");
    expect(dictatedName("Zmień nazwę na jakąś inną")).toBe("");
    expect(dictatedName("Zmień nazwę na inną")).toBe("");
  });

  it("nie reaguje na pytania i zwykłe wiadomości", () => {
    expect(dictatedName("Czy nazwa na pewno jest dobra?")).toBe("");
    expect(dictatedName("To nie miska, tylko czarka")).toBe("");
    expect(dictatedName("Zmień kategorię na Miski")).toBe("");
    expect(dictatedName("")).toBe("");
  });

  it("odrzuca nazwę dłuższą niż limit walidacji", () => {
    expect(dictatedName(`Zmień nazwę na ${"a".repeat(201)}`)).toBe("");
    expect(dictatedName(`Zmień nazwę na ${"a".repeat(200)}`)).toHaveLength(200);
  });
});
