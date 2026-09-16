// Ruch na stronie – czyste helpery z `lib/traffic.ts`: plan synchronizacji,
// koszyki godzin/dni tygodnia w czasie polskim, etykiety ścieżek, agregaty
// historii.

import { describe, expect, it } from "vitest";
import {
  addDays,
  dayKey,
  dayRange,
  dimensionValueLabel,
  hourBuckets,
  hourBucketsFromStats,
  isAdminPath,
  missingSyncDays,
  monthBuckets,
  pathLabel,
  percentChange,
  plannedSyncDays,
  productSlugFromPath,
  resolveTrafficRange,
  sumByValue,
  warsawHour,
  warsawWeekday,
  weekdayBuckets,
  withoutAdmin,
} from "@/lib/traffic";

const NOW = new Date("2026-09-16T10:00:00.000Z");

describe("daty UTC", () => {
  it("dayKey / addDays / dayRange", () => {
    expect(dayKey(NOW)).toBe("2026-09-16");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(dayRange("2026-09-14", "2026-09-16")).toEqual(["2026-09-14", "2026-09-15", "2026-09-16"]);
    expect(dayRange("2026-09-16", "2026-09-14")).toEqual([]);
  });

  it("resolveTrafficRange przyjmuje tylko znane zakresy", () => {
    expect(resolveTrafficRange("7")).toBe(7);
    expect(resolveTrafficRange("14")).toBe(14);
    expect(resolveTrafficRange("90")).toBe(30);
    expect(resolveTrafficRange(undefined)).toBe(30);
  });
});

describe("plan synchronizacji", () => {
  it("pusta baza: ostatnie dni od nowa, potem brakujące od najnowszych, przycięte do max", () => {
    const plan = plannedSyncDays({ now: NOW, synced: [], max: 4 });
    expect(plan).toEqual(["2026-09-15", "2026-09-14", "2026-09-13", "2026-09-12"]);
  });

  it("nigdy nie planuje dzisiaj – dzień jeszcze trwa", () => {
    const plan = plannedSyncDays({ now: NOW, synced: [], max: 50 });
    expect(plan).not.toContain("2026-09-16");
    expect(plan).toHaveLength(30);
  });

  it("dni do ponownego pobrania są w planie także wtedy, gdy już są w bazie", () => {
    const synced = dayRange("2026-08-17", "2026-09-15");
    const plan = plannedSyncDays({ now: NOW, synced, max: 4 });
    expect(plan).toEqual(["2026-09-15", "2026-09-14"]);
  });

  it("luki w środku okna są dociągane po dniach z ponownym pobraniem", () => {
    const synced = dayRange("2026-08-17", "2026-09-15").filter((d) => d !== "2026-09-01" && d !== "2026-09-10");
    const plan = plannedSyncDays({ now: NOW, synced, max: 10 });
    expect(plan).toEqual(["2026-09-15", "2026-09-14", "2026-09-10", "2026-09-01"]);
  });

  it("missingSyncDays ignoruje dni spoza okna", () => {
    const synced = dayRange("2026-08-17", "2026-09-15");
    expect(missingSyncDays({ now: NOW, synced })).toEqual([]);
    expect(missingSyncDays({ now: NOW, synced: [], window: 3 })).toEqual(["2026-09-15", "2026-09-14", "2026-09-13"]);
  });

  it("max = 0 daje pusty plan", () => {
    expect(plannedSyncDays({ now: NOW, synced: [], max: 0 })).toEqual([]);
  });
});

describe("liczby", () => {
  it("percentChange", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(10, null)).toBeNull();
  });
});

describe("czas polski", () => {
  it("godzina UTC → polska (lato +2, zima +1)", () => {
    expect(warsawHour("2026-07-01T22:30:00.000Z")).toBe(0);
    expect(warsawHour("2026-07-01T07:00:00.000Z")).toBe(9);
    expect(warsawHour("2026-01-15T23:00:00.000Z")).toBe(0);
    expect(warsawHour("2026-01-15T12:00:00.000Z")).toBe(13);
  });

  it("dzień tygodnia: 0 = poniedziałek", () => {
    expect(warsawWeekday("2026-09-14T00:00:00.000Z")).toBe(0); // poniedziałek
    expect(warsawWeekday("2026-09-20T00:00:00.000Z")).toBe(6); // niedziela
    // 23:30 UTC w lecie to już następny dzień w Polsce
    expect(warsawWeekday("2026-09-13T23:30:00.000Z")).toBe(0);
  });

  it("hourBuckets zlicza po godzinie polskiej", () => {
    const b = hourBuckets([
      { timestamp: "2026-07-01T07:00:00.000Z", pageviews: 3, visitors: 2 },
      { timestamp: "2026-07-02T07:00:00.000Z", pageviews: 1, visitors: 1 },
      { timestamp: "2026-07-01T22:00:00.000Z", pageviews: 5, visitors: 4 },
    ]);
    expect(b).toHaveLength(24);
    expect(b[9]).toMatchObject({ pageviews: 4, visitors: 3 });
    expect(b[0]).toMatchObject({ pageviews: 5, visitors: 4 });
    expect(b[10].pageviews).toBe(0);
  });

  it("hourBucketsFromStats składa datę i godzinę UTC z bazy", () => {
    const b = hourBucketsFromStats([{ date: "2026-07-01", value: "7", pageviews: 2, visitors: 1 }]);
    expect(b[9]).toMatchObject({ pageviews: 2, visitors: 1 });
  });

  it("weekdayBuckets", () => {
    const b = weekdayBuckets([
      { timestamp: "2026-09-14T00:00:00.000Z", pageviews: 10, visitors: 8 },
      { timestamp: "2026-09-21T00:00:00.000Z", pageviews: 4, visitors: 3 },
      { timestamp: "2026-09-19T00:00:00.000Z", pageviews: 1, visitors: 1 },
    ]);
    expect(b[0]).toMatchObject({ label: "Pn", pageviews: 14, visitors: 11 });
    expect(b[5]).toMatchObject({ label: "So", pageviews: 1 });
  });
});

describe("etykiety ścieżek", () => {
  const sources = {
    products: new Map([["kubek-morski", "Kubek morski"]]),
    categories: new Map([["kubki", "Kubki"]]),
    projects: new Map([["zastawa-slubna", "Zastawa ślubna"]]),
  };

  it("productSlugFromPath", () => {
    expect(productSlugFromPath("/sklep/kubek-morski")).toBe("kubek-morski");
    expect(productSlugFromPath("/sklep/kubek-morski/")).toBe("kubek-morski");
    expect(productSlugFromPath("/sklep/kategoria/kubki")).toBeNull();
    expect(productSlugFromPath("/sklep")).toBeNull();
    expect(productSlugFromPath("/sklep/kategoria")).toBeNull();
  });

  it("produkty, kategorie i projekty po nazwie z bazy", () => {
    expect(pathLabel("/sklep/kubek-morski", sources)).toEqual({ label: "Kubek morski", kind: "product" });
    expect(pathLabel("/sklep/kategoria/kubki", sources)).toEqual({ label: "Kategoria: Kubki", kind: "category" });
    expect(pathLabel("/moje-projekty/zastawa-slubna", sources)).toEqual({ label: "Projekt: Zastawa ślubna", kind: "project" });
  });

  it("nieznany slug zostaje ścieżką, stałe strony ze słownika, panel oznaczony", () => {
    expect(pathLabel("/sklep/nie-ma", sources)).toEqual({ label: "/sklep/nie-ma", kind: "product" });
    expect(pathLabel("/", sources)).toEqual({ label: "Strona główna", kind: "page" });
    expect(pathLabel("/warsztaty/", sources).label).toBe("Warsztaty");
    expect(pathLabel("/admin/produkty", sources)).toEqual({ label: "Panel: /produkty", kind: "admin" });
    expect(pathLabel("/cokolwiek", sources).label).toBe("/cokolwiek");
  });

  it("dimensionValueLabel", () => {
    expect(dimensionValueLabel("country", "PL")).toBe("Polska");
    expect(dimensionValueLabel("country", "")).toBe("Nieznany");
    expect(dimensionValueLabel("deviceType", "mobile")).toBe("Telefon");
    expect(dimensionValueLabel("referrerHostname", "")).toBe("Wejścia bezpośrednie / brak");
    expect(dimensionValueLabel("referrerHostname", "instagram.com")).toBe("instagram.com");
    expect(dimensionValueLabel("route", "/sklep/[slug]")).toBe("Karta produktu");
    expect(dimensionValueLabel("utmSource", "Others")).toBe("Pozostałe");
    expect(dimensionValueLabel("utmSource", "")).toBe("(brak)");
    expect(dimensionValueLabel("requestPath", "/sklep/kubek-morski", sources)).toBe("Kubek morski");
  });
});

describe("panel admina", () => {
  it("isAdminPath rozpoznaje panel, ale nie ścieżki o podobnym początku", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/produkty/abc")).toBe(true);
    expect(isAdminPath("/administracja")).toBe(false);
    expect(isAdminPath("/sklep/admin")).toBe(false);
    expect(isAdminPath("/")).toBe(false);
  });

  it("withoutAdmin wycina ścieżki i wzorce tras panelu", () => {
    const rows = [
      { value: "/sklep", pageviews: 5, visitors: 4 },
      { value: "/admin/zamowienia", pageviews: 50, visitors: 1 },
      { value: "/admin/produkty/[id]", pageviews: 9, visitors: 1 },
    ];
    expect(withoutAdmin(rows).map((r) => r.value)).toEqual(["/sklep"]);
  });
});

describe("agregaty historii", () => {
  it("monthBuckets sumuje dni i liczy je", () => {
    const m = monthBuckets([
      { date: "2026-08-30", pageviews: 10, visitors: 5 },
      { date: "2026-08-31", pageviews: 20, visitors: 6 },
      { date: "2026-09-01", pageviews: 7, visitors: 7 },
    ]);
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ year: 2026, month: 8, label: "Sie 26", pageviews: 30, visitors: 11, days: 2 });
    expect(m[1]).toMatchObject({ year: 2026, month: 9, pageviews: 7, days: 1 });
  });

  it("sumByValue scala wartości z wielu dni i sortuje malejąco", () => {
    const s = sumByValue([
      { value: "PL", pageviews: 5, visitors: 3 },
      { value: "DE", pageviews: 9, visitors: 2 },
      { value: "PL", pageviews: 6, visitors: 4 },
    ]);
    expect(s).toEqual([
      { value: "PL", pageviews: 11, visitors: 7 },
      { value: "DE", pageviews: 9, visitors: 2 },
    ]);
    expect(sumByValue(s, 1)).toHaveLength(1);
  });
});
