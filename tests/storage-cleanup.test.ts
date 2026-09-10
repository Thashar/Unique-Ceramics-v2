import { describe, it, expect } from "vitest";
import {
  CLEANUP_MIN_AGE_MS,
  baseName,
  collectUsedNames,
  findUnused,
  totalSize,
  type StorageFile,
} from "@/lib/storage-cleanup";
import { IMAGE_VARIANT_WIDTHS } from "@/lib/image-variants";

const STORAGE = "https://xyz.supabase.co/storage/v1/object/public/products";
const PHOTO = "1785077450738-ntb9sx08wur.webp";
const AI_PHOTO = "1787993631053-qlsd4fc207-ai.webp";

// Pomyłka tutaj kasuje zdjęcie ze sklepu bezpowrotnie, więc każde źródło adresu
// ma własny przypadek: lista `images`, JSON galerii i treść HTML z edytora.
describe("rozpoznawanie używanych plików", () => {
  it("chroni oryginał razem ze wszystkimi rozmiarami", () => {
    const used = collectUsedNames([`${STORAGE}/${PHOTO}`]);
    expect(used.has(PHOTO)).toBe(true);
    for (const w of IMAGE_VARIANT_WIDTHS) {
      expect(used.has(PHOTO.replace(".webp", `-w${w}.webp`))).toBe(true);
    }
  });

  it("wskazanie samego wariantu chroni oryginał", () => {
    const used = collectUsedNames([`${STORAGE}/1785077450738-ntb9sx08wur-w800.webp`]);
    expect(used.has(PHOTO)).toBe(true);
    expect(used.has("1785077450738-ntb9sx08wur-w400.webp")).toBe(true);
  });

  it("czyta adres z JSON-a galerii", () => {
    const json = JSON.stringify([{ url: `${STORAGE}/${PHOTO}`, position: "50% 50%" }]);
    expect(collectUsedNames([json]).has(PHOTO)).toBe(true);
  });

  it("czyta adres wstawiony w treść HTML", () => {
    // Edytor Jodit pozwala wstawić obrazek w środek opisu – bez tego sprzątanie
    // uznałoby takie zdjęcie za nieużywane
    const html = `<p>Tekst</p><img src="${STORAGE}/${AI_PHOTO}" alt=""><p>dalej</p>`;
    expect(collectUsedNames([html]).has(AI_PHOTO)).toBe(true);
  });

  it("rozpoznaje nazwę bez pełnego adresu", () => {
    expect(collectUsedNames([`plik: ${PHOTO}`]).has(PHOTO)).toBe(true);
  });

  it("pusty tekst niczego nie chroni", () => {
    expect(collectUsedNames(["", "brak zdjęć"]).size).toBe(0);
  });

  it("sprowadza wariant do nazwy bazowej", () => {
    expect(baseName("abc-w400.webp")).toBe("abc.webp");
    expect(baseName("abc.webp")).toBe("abc.webp");
  });
});

describe("wybór plików do usunięcia", () => {
  const now = Date.parse("2026-09-10T00:00:00Z");
  const old = new Date(now - 30 * 86_400_000).toISOString();
  const fresh = new Date(now - 60_000).toISOString();

  const file = (name: string, createdAt: string | null, size = 1000): StorageFile => ({
    name,
    size,
    createdAt,
  });

  it("zwraca plik, którego nic nie wskazuje", () => {
    const { unused } = findUnused([file(PHOTO, old)], new Set(), { now });
    expect(unused.map((f) => f.name)).toEqual([PHOTO]);
  });

  it("pomija plik używany", () => {
    const { unused } = findUnused([file(PHOTO, old)], new Set([PHOTO]), { now });
    expect(unused).toEqual([]);
  });

  it("nie rusza świeżo wgranego pliku", () => {
    // Zdjęcie w otwartym formularzu leży już w magazynie, choć nikt nie kliknął „Zapisz”
    const { unused, tooFresh } = findUnused([file(PHOTO, fresh)], new Set(), { now });
    expect(unused).toEqual([]);
    expect(tooFresh).toBe(1);
  });

  it("plik bez daty traktuje jak świeży i zostawia", () => {
    const { unused, tooFresh } = findUnused([file(PHOTO, null)], new Set(), { now });
    expect(unused).toEqual([]);
    expect(tooFresh).toBe(1);
  });

  it("pomija pliki, które nie są zdjęciami", () => {
    const { unused } = findUnused([file(".emptyFolderPlaceholder", old)], new Set(), { now });
    expect(unused).toEqual([]);
  });

  it("karencja to tydzień", () => {
    expect(CLEANUP_MIN_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("sumuje rozmiar kandydatów", () => {
    expect(totalSize([{ size: 1000 }, { size: 2500 }])).toBe(3500);
  });
});
