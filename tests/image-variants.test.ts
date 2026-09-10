import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  IMAGE_VARIANT_WIDTHS,
  isVariantName,
  pendingOriginals,
  bestVariantUrl,
  hasVariants,
  isStorageImage,
  variantName,
  variantNames,
} from "@/lib/image-variants";
import { isAiGeneratedImage } from "@/lib/ai";
import imageLoader from "@/lib/image-loader";
import { describeFailure, isUnreadableImage } from "@/lib/image-migration";

const STORAGE = "https://xyz.supabase.co/storage/v1/object/public/products";
const photo = `${STORAGE}/1787993631053-qlsd4fc207.webp`;

describe("rozpoznawanie zdjęć ze Storage", () => {
  it("rozpoznaje własne zdjęcie", () => {
    expect(isStorageImage(photo)).toBe(true);
  });

  it("odróżnia pliki z public/ od Storage", () => {
    expect(isStorageImage("/images/hero.webp")).toBe(false);
    // ...ale warianty mają: hero, „O mnie", warsztaty, logo i wordmark leżą w repo
    expect(hasVariants("/images/hero.webp")).toBe(true);
    expect(hasVariants("/images/logo.webp")).toBe(true);
  });

  it("pomija martwy katalog public/images/products", () => {
    // Pliki sprzed przeniesienia katalogu do Storage – nikt ich nie renderuje
    // i wariantów nie mają, więc loader musi zostawić je w spokoju
    expect(hasVariants("/images/products/miska-granatowa.webp")).toBe(false);
  });

  it("nie rusza obcych adresów", () => {
    expect(isStorageImage("https://obcy.example/foto.webp")).toBe(false);
    expect(hasVariants("https://obcy.example/foto.webp")).toBe(false);
  });
});

describe("dobór wariantu", () => {
  it("bierze najmniejszy wariant pokrywający żądaną szerokość", () => {
    expect(bestVariantUrl(photo, 400)).toBe(variantName(photo, 400));
    expect(bestVariantUrl(photo, 401)).toBe(variantName(photo, 800));
    expect(bestVariantUrl(photo, 800)).toBe(variantName(photo, 800));
    expect(bestVariantUrl(photo, 1600)).toBe(variantName(photo, 1600));
  });

  it("powyżej największego wariantu oddaje oryginał", () => {
    expect(bestVariantUrl(photo, 1920)).toBe(photo);
    expect(bestVariantUrl(photo, 3840)).toBe(photo);
  });

  it("zdjęcia z public/ kieruje do ich wariantów", () => {
    expect(bestVariantUrl("/images/hero.webp", 800)).toBe("/images/hero-w800.webp");
  });

  it("zdjęcia bez wariantów zostawia bez zmian", () => {
    expect(bestVariantUrl("/images/products/miska-granatowa.webp", 800))
      .toBe("/images/products/miska-granatowa.webp");
    expect(bestVariantUrl("https://obcy.example/foto.webp", 800))
      .toBe("https://obcy.example/foto.webp");
  });

  it("nie dokleja drugiego sufiksu do gotowego wariantu", () => {
    const variant = variantName(photo, 800);
    expect(bestVariantUrl(variant, 400)).toBe(variant);
  });

  it("loader next/image zwraca to samo co dobór wariantu", () => {
    expect(imageLoader({ src: photo, width: 800 })).toBe(bestVariantUrl(photo, 800));
    expect(imageLoader({ src: "/images/hero.webp", width: 800 })).toBe("/images/hero-w800.webp");
  });
});

describe("nazewnictwo wariantów", () => {
  it("wstawia szerokość przed rozszerzeniem", () => {
    expect(variantName("abc.webp", 400)).toBe("abc-w400.webp");
  });

  it("wypisuje komplet nazw", () => {
    expect(variantNames("abc.webp")).toEqual(IMAGE_VARIANT_WIDTHS.map((w) => `abc-w${w}.webp`));
  });

  // Sufiks `-ai` rozstrzyga, czy panel pokaże przyciski AI pod zdjęciem.
  // W bazie zapisujemy oryginał, więc rozpoznanie musi działać jak dotąd.
  it("nie psuje rozpoznawania zdjęć z AI", () => {
    const aiPhoto = `${STORAGE}/1787993631053-qlsd4fc207-ai.webp`;
    expect(isAiGeneratedImage(aiPhoto)).toBe(true);
    expect(bestVariantUrl(aiPhoto, 400)).toBe(`${STORAGE}/1787993631053-qlsd4fc207-ai-w400.webp`);
  });
});

// Next buduje `srcSet` z `deviceSizes`/`imageSizes` i dla każdej wartości woła
// loader. Szerokość bez odpowiadającego pliku dostałaby najbliższy większy wariant
// (za duży transfer), a wariant bez wpisu w listach nigdy by się nie pojawił.
// Rozjazd obu miejsc jest cichy, więc pilnuje go test.
describe("zgodność z konfiguracją Next", () => {
  it("deviceSizes i imageSizes pokrywają się z listą wariantów", () => {
    const config = readFileSync("next.config.ts", "utf-8");
    const read = (key: string) => {
      const match = config.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
      if (!match) throw new Error(`Brak ${key} w next.config.ts`);
      return match[1]
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((n) => Number.isFinite(n));
    };
    const configured = [...read("imageSizes"), ...read("deviceSizes")].sort((a, b) => a - b);
    expect(configured).toEqual([...IMAGE_VARIANT_WIDTHS].sort((a, b) => a - b));
  });

  it("skrypt migracyjny czyta tę samą listę szerokości", () => {
    const script = readFileSync("scripts/generate-image-variants.mjs", "utf-8");
    expect(script).toContain("IMAGE_VARIANT_WIDTHS");
    expect(script).toContain("lib/image-variants.ts");
  });
});

// Migracja zdjęć wgranych, zanim warianty istniały (przycisk w Ustawieniach → Zdjęcia).
// Lista bierze się z bucketa, więc funkcja musi rozróżniać oryginały od wariantów
// i widzieć braki – pominięte zdjęcie zostaje w sklepie pustym kadrem.
describe("migracja zdjęć bez wariantów", () => {
  const complete = ["a.webp", ...IMAGE_VARIANT_WIDTHS.map((w) => `a-w${w}.webp`)];

  it("rozpoznaje warianty po sufiksie", () => {
    expect(isVariantName("a-w400.webp")).toBe(true);
    expect(isVariantName("a.webp")).toBe(false);
    // Nazwa z „-w" bez cyfr to zwykły plik (np. thashar-wordmark.webp)
    expect(isVariantName("thashar-wordmark.webp")).toBe(false);
  });

  it("pomija zdjęcia z kompletem rozmiarów", () => {
    expect(pendingOriginals(complete)).toEqual([]);
  });

  it("zwraca zdjęcie, któremu brakuje choć jednego rozmiaru", () => {
    const incomplete = complete.slice(0, complete.length - 1);
    expect(pendingOriginals(incomplete)).toEqual(["a.webp"]);
  });

  it("zwraca zdjęcie bez żadnego wariantu", () => {
    expect(pendingOriginals(["b.webp"])).toEqual(["b.webp"]);
  });

  it("nie traktuje wariantu jak oryginału do przetworzenia", () => {
    // Bez tego migracja doklejałaby warianty do wariantów (`a-w400-w400.webp`)
    expect(pendingOriginals(["a-w400.webp"])).toEqual([]);
  });

  it("pomija pliki, które nie są WebP", () => {
    expect(pendingOriginals(["c.jpg", "d.png"])).toEqual([]);
  });
});

// Migracja natrafiła na produkcji na pliki wgrane **starym uploadem**, zanim trasa
// zaczęła wysyłać `Blob` zamiast `Buffer`a: supabase-js przepuszczał wtedy bajty przez
// konwersję na tekst i każdy spoza ASCII stawał się `EF BF BD`. `sharp` odmawia takiego
// pliku, a migracja stała na nim w kółko, bo bez wariantów wracał na początek listy.
describe("uszkodzone pliki w magazynie", () => {
  it("rozpoznaje plik, którego sharp nie umie odczytać", () => {
    expect(isUnreadableImage("Input buffer contains unsupported image format")).toBe(true);
    expect(isUnreadableImage("Input file contains unsupported image format")).toBe(true);
  });

  it("nie bierze za uszkodzony zwykłego błędu magazynu", () => {
    expect(isUnreadableImage("nie udało się zapisać rozmiaru 400 px: timeout")).toBe(false);
  });

  it("tłumaczy powód na wskazówkę po polsku", () => {
    const opis = describeFailure("Input buffer contains unsupported image format");
    expect(opis).toContain("uszkodzony");
    expect(opis).toContain("wgraj to zdjęcie ponownie");
  });

  it("inne powody zostawia bez zmian", () => {
    expect(describeFailure("brak pliku")).toBe("brak pliku");
  });
});
