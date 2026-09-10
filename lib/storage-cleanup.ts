import { STORAGE_BUCKET, isVariantName, variantNames } from "@/lib/image-variants";

/**
 * Wyszukiwanie **nieużywanych plików** w Supabase Storage.
 *
 * Nic w panelu nie kasuje plików z magazynu (patrz „Osierocone pliki” w CLAUDE.md):
 * usunięcie produktu kasuje wiersz w bazie, usunięcie kafelka zmienia tylko listę
 * adresów, a upload jest natychmiastowy – porzucone i podmienione zdjęcia zostają.
 * Ten moduł liczy, których plików nie wskazuje **nic** w bazie.
 *
 * ⚠️ Pomyłka tutaj kasuje zdjęcie ze sklepu **bezpowrotnie**, więc obowiązują trzy zasady:
 *
 * 1. **Szukamy w całym tekście, nie w znanych polach.** Adres zdjęcia bywa nie tylko
 *    w `Product.images`, ale też w opisie projektu i w treściach HTML z ustawień –
 *    edytor Jodit pozwala wstawić obrazek w środek tekstu. Dlatego wejściem jest
 *    surowa treść wszystkich pól, a nie lista kluczy, którą łatwo przeoczyć.
 * 2. **Wariant idzie z oryginałem.** Wskazanie `abc.webp` chroni też `abc-w400.webp`;
 *    wskazanie samego wariantu chroni oryginał i pozostałe rozmiary.
 * 3. **Świeże pliki są nietykalne.** Zdjęcie wgrane do otwartego formularza istnieje
 *    w magazynie, zanim ktokolwiek kliknie „Zapisz” – bez karencji sprzątanie kasowałoby
 *    je w trakcie pracy.
 */

/**
 * Nazwa pliku z uploadu: znacznik czasu, myślnik, losowy sufiks, opcjonalnie `-ai`
 * i rozmiar wariantu. Szukamy jej **w dowolnym tekście**, nie tylko w pełnym adresie –
 * dzięki temu łapiemy też zapisy, których nie przewidzieliśmy (encje HTML, fragmenty
 * JSON-a, adresy zapisane inaczej niż dziś).
 */
const FILE_NAME_PATTERN = /\d{10,}-[A-Za-z0-9]+(?:-ai)?(?:-w\d+)?\.webp/g;

/** Fragment adresu wskazujący nasz bucket – do rozpoznania pełnych URL-i. */
const BUCKET_PATH = `/object/public/${STORAGE_BUCKET}/`;

/** Nazwa bazowa wariantu: `abc-w400.webp` → `abc.webp`. */
export function baseName(name: string): string {
  return isVariantName(name) ? name.replace(/-w\d+\.webp$/, ".webp") : name;
}

/**
 * Nazwy plików wskazywane przez podane teksty – **razem z wariantami**.
 *
 * Wejściem jest wszystko, co w bazie może nieść adres zdjęcia: pola `images`,
 * opisy i wartości ustawień. Rozpoznana nazwa chroni całą rodzinę plików (oryginał
 * plus wszystkie rozmiary), bo `srcSet` w sklepie sięga po nie wszystkie.
 */
export function collectUsedNames(sources: readonly string[]): Set<string> {
  const used = new Set<string>();
  for (const text of sources) {
    if (!text) continue;
    for (const match of text.matchAll(FILE_NAME_PATTERN)) {
      const base = baseName(match[0]);
      used.add(base);
      for (const variant of variantNames(base)) used.add(variant);
    }
  }
  return used;
}

/** Czy tekst wskazuje na plik z naszego magazynu (do rozpoznania obcych adresów). */
export function isOwnStorageUrl(url: string): boolean {
  return url.includes(BUCKET_PATH);
}

export type StorageFile = { name: string; size: number; createdAt: string | null };
export type UnusedFile = StorageFile & { base: string };

/** Karencja: pliki młodsze niż tydzień zostają nietknięte. */
export const CLEANUP_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type UnusedResult = {
  unused: UnusedFile[];
  /** Ile plików pominięto **wyłącznie** ze względu na wiek – panel to pokazuje. */
  tooFresh: number;
};

/**
 * Pliki, których nie wskazuje nic w bazie i które są starsze od karencji.
 *
 * Plik bez daty utworzenia traktujemy jak świeży i **zostawiamy** – lepiej zostawić
 * śmieć niż skasować zdjęcie, o którym magazyn nie potrafił nic powiedzieć.
 */
export function findUnused(
  files: readonly StorageFile[],
  used: ReadonlySet<string>,
  { now = Date.now(), minAgeMs = CLEANUP_MIN_AGE_MS }: { now?: number; minAgeMs?: number } = {}
): UnusedResult {
  const unused: UnusedFile[] = [];
  let tooFresh = 0;

  for (const file of files) {
    if (!file.name.endsWith(".webp")) continue;
    if (used.has(file.name)) continue;

    const created = file.createdAt ? Date.parse(file.createdAt) : NaN;
    if (!Number.isFinite(created) || now - created < minAgeMs) {
      tooFresh++;
      continue;
    }
    unused.push({ ...file, base: baseName(file.name) });
  }

  return { unused, tooFresh };
}

/** Łączny rozmiar listy plików – panel pokazuje, ile miejsca zwolni sprzątanie. */
export function totalSize(files: readonly { size: number }[]): number {
  return files.reduce((sum, f) => sum + (Number.isFinite(f.size) ? f.size : 0), 0);
}
