import { describe, expect, it } from "vitest";
import {
  formatPrice,
  hasEnglishVersion,
  localeFromPath,
  localePath,
  stripLocale,
  switchLocalePath,
} from "@/lib/i18n";
import { t } from "@/lib/dictionary";

// Wersja angielska żyje pod `/en` i obejmuje tylko strony informacyjne.
// Regresja tutaj to link z `/en/sklep` prowadzący na polską stronę albo –
// gorzej – `/en/koszyk`, którego nie ma (404 z nagłówka sklepu).

describe("localeFromPath / stripLocale", () => {
  it("rozpoznaje angielski po prefiksie /en", () => {
    expect(localeFromPath("/en")).toBe("en");
    expect(localeFromPath("/en/sklep/kubek")).toBe("en");
    expect(localeFromPath("/")).toBe("pl");
    expect(localeFromPath("/sklep")).toBe("pl");
    expect(localeFromPath(null)).toBe("pl");
    // `/english` to nie wersja angielska
    expect(localeFromPath("/english")).toBe("pl");
  });

  it("zdejmuje prefiks języka", () => {
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/en/sklep")).toBe("/sklep");
    expect(stripLocale("/sklep")).toBe("/sklep");
  });
});

describe("hasEnglishVersion", () => {
  it("obejmuje strony informacyjne, a nie koszyk, konto i regulamin", () => {
    for (const path of [
      "/", "/sklep", "/sklep/kubek-x", "/sklep/kategoria/kubki", "/o-mnie", "/warsztaty",
      "/kontakt", "/moje-projekty", "/moje-projekty/misa", "/zamowienie-indywidualne",
    ]) {
      expect(hasEnglishVersion(path), path).toBe(true);
    }
    for (const path of [
      "/koszyk", "/zamowienie", "/konto", "/konto/zamowienia", "/logowanie",
      "/regulamin", "/polityka-prywatnosci", "/admin/produkty",
    ]) {
      expect(hasEnglishVersion(path), path).toBe(false);
    }
  });

  it("akceptuje ścieżkę już z prefiksem i ignoruje query", () => {
    expect(hasEnglishVersion("/en/sklep")).toBe(true);
    expect(hasEnglishVersion("/kontakt?produkt=kubek")).toBe(true);
  });
});

describe("localePath", () => {
  it("po polsku nic nie zmienia", () => {
    expect(localePath("pl", "/sklep")).toBe("/sklep");
    expect(localePath("pl", "/en/sklep")).toBe("/sklep");
  });

  it("po angielsku dokłada prefiks tylko stronom z wersją angielską", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/sklep/kubek")).toBe("/en/sklep/kubek");
    // Koszyk, konto i regulamin istnieją tylko po polsku
    expect(localePath("en", "/koszyk")).toBe("/koszyk");
    expect(localePath("en", "/regulamin")).toBe("/regulamin");
  });
});

describe("switchLocalePath", () => {
  it("przełącza tę samą stronę między językami", () => {
    expect(switchLocalePath("/sklep/kubek", "en")).toBe("/en/sklep/kubek");
    expect(switchLocalePath("/en/sklep/kubek", "pl")).toBe("/sklep/kubek");
    expect(switchLocalePath("/en", "pl")).toBe("/");
  });

  it("strona bez odpowiednika odsyła na stronę główną języka", () => {
    expect(switchLocalePath("/koszyk", "en")).toBe("/en");
    expect(switchLocalePath("/konto/zamowienia", "en")).toBe("/en");
  });
});

describe("formatPrice", () => {
  it("po polsku złotówki z przecinkiem, po angielsku kod waluty", () => {
    expect(formatPrice("pl", 160)).toBe("160,00 zł");
    expect(formatPrice("en", 160)).toBe("PLN\u00a0160.00");
    expect(formatPrice("en", 1250.5, { compact: true })).toBe("PLN\u00a01,250.5");
  });
});

describe("słownik", () => {
  it("angielski ma te same klucze co polski", () => {
    const pl = t("pl") as unknown as Record<string, Record<string, unknown>>;
    const en = t("en") as unknown as Record<string, Record<string, unknown>>;
    for (const section of Object.keys(pl)) {
      expect(Object.keys(en[section] ?? {}).sort(), section).toEqual(Object.keys(pl[section]).sort());
    }
  });

  it("nie zawiera długich myślników", () => {
    const json = JSON.stringify(t("pl")) + JSON.stringify(t("en"));
    expect(json.includes("—")).toBe(false);
  });
});
