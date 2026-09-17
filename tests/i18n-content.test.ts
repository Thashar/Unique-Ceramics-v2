import { describe, expect, it } from "vitest";
import {
  collectStrings,
  enCategoryKey,
  enProductKey,
  enProjectKey,
  enSettingKey,
  localizeCategories,
  localizeProduct,
  localizeProject,
  localizedSetting,
  parseEnglishRows,
  replaceStrings,
} from "@/lib/i18n-content";

// Tłumaczenia leżą w `Setting` pod kluczami `en_*` i są nakładane na dane
// z bazy przy renderze `/en`. Regresja tutaj to angielska strona z polskim
// tekstem mimo wpisanego tłumaczenia albo – gorzej – tłumaczenie wpisane
// w cudze pole po podmianie napisów w JSON-ie.

describe("parseEnglishRows", () => {
  it("rozdziela klucze na ustawienia, produkty, kategorie i projekty", () => {
    const en = parseEnglishRows([
      { key: enSettingKey("home_hero_title"), value: "Handmade" },
      { key: enProductKey("p1"), value: JSON.stringify({ name: "Mug", description: "Blue mug" }) },
      { key: enCategoryKey("c1"), value: " Mugs " },
      { key: enProjectKey("j1"), value: JSON.stringify({ title: "Set", description: "<p>x</p>" }) },
      { key: "home_hero_title", value: "polski – ignorowany" },
    ]);
    expect(en.settings).toEqual({ home_hero_title: "Handmade" });
    expect(en.products.p1).toEqual({ name: "Mug", description: "Blue mug" });
    expect(en.categories.c1).toBe("Mugs");
    expect(en.projects.j1).toEqual({ title: "Set", description: "<p>x</p>" });
  });

  it("zepsuty JSON nie wywraca odczytu", () => {
    const en = parseEnglishRows([{ key: enProductKey("p1"), value: "{nie json" }]);
    expect(en.products.p1).toEqual({ name: "", description: "" });
  });
});

describe("localizedSetting", () => {
  const settings = { home_hero_title: "Ręcznie", empty: "", custom: "Własny tekst" };
  const en = parseEnglishRows([{ key: enSettingKey("home_hero_title"), value: "Handmade" }]);
  const defaults = { pl: "Ręcznie", en: "Handmade (default)" };

  it("po polsku oddaje polski tekst", () => {
    expect(localizedSetting("pl", "home_hero_title", settings, en, defaults)).toBe("Ręcznie");
  });

  it("po angielsku bierze tłumaczenie z panelu", () => {
    expect(localizedSetting("en", "home_hero_title", settings, en, defaults)).toBe("Handmade");
  });

  it("bez tłumaczenia: angielski domyślny tylko przy nietkniętym polskim domyślnym", () => {
    const none = parseEnglishRows([]);
    expect(localizedSetting("en", "home_hero_title", settings, none, defaults)).toBe("Handmade (default)");
    expect(localizedSetting("en", "custom", settings, none, defaults)).toBe("Własny tekst");
  });

  it("puste polskie pole ukrywa element także po angielsku", () => {
    const withEn = parseEnglishRows([{ key: enSettingKey("empty"), value: "Something" }]);
    expect(localizedSetting("en", "empty", settings, withEn)).toBe("Something");
    expect(localizedSetting("en", "empty", settings, parseEnglishRows([]))).toBe("");
  });
});

describe("localizeProduct / localizeCategories / localizeProject", () => {
  const en = parseEnglishRows([
    { key: enProductKey("p1"), value: JSON.stringify({ name: "Mug", description: "" }) },
    { key: enCategoryKey("c1"), value: "Mugs" },
    { key: enProjectKey("j1"), value: JSON.stringify({ title: "", description: "<p>Set</p>" }) },
  ]);

  it("podmienia tylko wypełnione pola, resztę zostawia po polsku", () => {
    const product = localizeProduct("en", { id: "p1", name: "Kubek", description: "Niebieski" }, en);
    expect(product).toEqual({ id: "p1", name: "Mug", description: "Niebieski" });
    const project = localizeProject("en", { id: "j1", title: "Zestaw", description: "<p>Zestaw</p>" }, en);
    expect(project).toEqual({ id: "j1", title: "Zestaw", description: "<p>Set</p>" });
  });

  it("produkt bez pola opisu (karuzela) nie dostaje go z tłumaczenia", () => {
    const slim = localizeProduct("en", { id: "p1", name: "Kubek" }, en);
    expect(slim).toEqual({ id: "p1", name: "Mug" });
  });

  it("po polsku i bez tłumaczenia oddaje oryginał", () => {
    const original = { id: "p9", name: "Misa", description: null };
    expect(localizeProduct("pl", original, en)).toBe(original);
    expect(localizeProduct("en", original, en)).toBe(original);
  });

  it("kategorie kluczowane po id, nie po slugu", () => {
    const cats = [
      { id: "c1", slug: "kubki", label: "Kubki" },
      { id: "c2", slug: "inne", label: "Inne" },
    ];
    expect(localizeCategories("en", cats, en).map((c) => c.label)).toEqual(["Mugs", "Inne"]);
    expect(localizeCategories("pl", cats, en)).toBe(cats);
  });
});

describe("collectStrings / replaceStrings", () => {
  const offers = [
    { id: 1, iconName: "Leaf", title: "Toczenie", description: "Na kole", duration: "2 h", active: true },
    { id: 2, iconName: "Flame", title: "Szkliwienie", description: "", duration: "1 h", active: false },
  ];

  it("zbiera napisy z pominięciem id, ikon i flag", () => {
    expect(collectStrings(offers)).toEqual(["Toczenie", "Na kole", "2 h", "Szkliwienie", "", "1 h"]);
  });

  it("wstawia tłumaczenia w tej samej kolejności, zostawiając strukturę", () => {
    const translated = replaceStrings(offers, ["Throwing", "On the wheel", "2 h", "Glazing", "", "1 h"]);
    expect(translated).toEqual([
      { id: 1, iconName: "Leaf", title: "Throwing", description: "On the wheel", duration: "2 h", active: true },
      { id: 2, iconName: "Flame", title: "Glazing", description: "", duration: "1 h", active: false },
    ]);
  });

  it("za krótka lista tłumaczeń zostawia resztę bez zmian", () => {
    const partial = replaceStrings(offers, ["Throwing"]) as typeof offers;
    expect(partial[0].title).toBe("Throwing");
    expect(partial[0].description).toBe("Na kole");
    expect(partial[1].title).toBe("Szkliwienie");
  });
});
