/**
 * Wersja angielska strony – adresy i rozpoznawanie języka.
 *
 * Angielski jest **dodatkiem do czytania**, nie drugim sklepem: żyje pod
 * prefiksem `/en` i obejmuje wyłącznie strony informacyjne (strona główna,
 * katalog, karta produktu, O mnie, Warsztaty, Moje projekty, Kontakt,
 * zamówienie indywidualne). Koszyk, zamówienie, konto, maile i panel zostają
 * po polsku, a na wersji angielskiej **nie da się nic kupić** – karta produktu
 * pokazuje zamiast koszyka informację o zamówieniu indywidualnym (sklep
 * prowadzi sprzedaż tylko w Polsce; decyzja właściciela 17.09.2026).
 *
 * Polskie adresy zostają **bez prefiksu** – to one są zaindeksowane.
 *
 * Język nie jest czytany z cookie ani z nagłówków: odczyt któregokolwiek robi
 * ze strony w pełni dynamiczną i wyłącza ISR (tak działał `/sklep` do
 * 16.09.2026 – 2,2 s TTFB). Strony pod `/en` są osobnymi trasami, więc
 * serwer zna język z samego położenia pliku, a komponenty klienckie czytają
 * go z `usePathname()` (patrz `lib/use-locale.ts`).
 *
 * Moduł neutralny – bez bazy, bez Reacta; pokryty testami w `tests/i18n.test.ts`.
 */

export type Locale = "pl" | "en";

export const LOCALES: readonly Locale[] = ["pl", "en"];
export const DEFAULT_LOCALE: Locale = "pl";

/** Prefiks adresów wersji angielskiej (bez końcowego ukośnika). */
export const EN_PREFIX = "/en";

/** Język HTML (`<html lang>`) i Open Graph dla obu wersji. */
export const HTML_LANG: Record<Locale, string> = { pl: "pl", en: "en" };
export const OG_LOCALE: Record<Locale, string> = { pl: "pl_PL", en: "en_GB" };
/** `inLanguage` w danych strukturalnych. */
export const SCHEMA_LANG: Record<Locale, string> = { pl: "pl-PL", en: "en-GB" };

export function isLocale(value: unknown): value is Locale {
  return value === "pl" || value === "en";
}

/** Język z adresu: `/en` i `/en/...` to angielski, wszystko inne – polski. */
export function localeFromPath(pathname: string | null | undefined): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`) ? "en" : "pl";
}

/** Ścieżka bez prefiksu języka (`/en/sklep` → `/sklep`, `/en` → `/`). */
export function stripLocale(pathname: string): string {
  if (pathname === EN_PREFIX) return "/";
  if (pathname.startsWith(`${EN_PREFIX}/`)) return pathname.slice(EN_PREFIX.length);
  return pathname;
}

/**
 * Wzorce ścieżek, które **mają** wersję angielską. Wszystko poza nimi
 * (koszyk, zamówienie, konto, regulamin…) istnieje tylko po polsku.
 */
const EN_PAGE_PATTERNS: readonly RegExp[] = [
  /^\/$/,
  /^\/sklep$/,
  /^\/sklep\/kategoria\/[a-z0-9-]+$/,
  /^\/sklep\/[a-z0-9-]+$/,
  /^\/o-mnie$/,
  /^\/warsztaty$/,
  /^\/kontakt$/,
  /^\/moje-projekty$/,
  /^\/moje-projekty\/[a-z0-9-]+$/,
  /^\/zamowienie-indywidualne$/,
];

/** Czy polska ścieżka (bez prefiksu) ma odpowiednik po angielsku. */
export function hasEnglishVersion(path: string): boolean {
  const clean = stripLocale(path).split(/[?#]/)[0];
  return EN_PAGE_PATTERNS.some((re) => re.test(clean));
}

/**
 * Adres w danym języku. Polskie ścieżki idą bez zmian, angielskie dostają
 * prefiks – ale **tylko strony, które po angielsku istnieją**. Link do koszyka
 * albo konta z wersji angielskiej prowadzi na polską stronę, bo tam kończy
 * się wersja angielska.
 */
export function localePath(locale: Locale, path: string): string {
  const clean = stripLocale(path);
  if (locale === "pl" || !hasEnglishVersion(clean)) return clean;
  return clean === "/" ? EN_PREFIX : `${EN_PREFIX}${clean}`;
}

/**
 * Adres tej samej strony po przełączeniu języka. Strona bez odpowiednika
 * w drugim języku odsyła do jego strony głównej – lepiej niż 404.
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const clean = stripLocale(pathname);
  if (target === "pl") return clean;
  return hasEnglishVersion(clean) ? localePath("en", clean) : EN_PREFIX;
}

/** Formatowanie kwot: „160,00 zł” po polsku, „PLN 160.00” po angielsku. */
export function formatPrice(locale: Locale, value: number, options: { compact?: boolean } = {}): string {
  if (locale === "pl") {
    if (options.compact) {
      return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: "PLN",
        minimumFractionDigits: 0,
      }).format(value);
    }
    return `${value.toFixed(2).replace(".", ",")} zł`;
  }
  // Kod waluty przed kwotą, twarda spacja – „PLN 160.00” nie łamie się w połowie
  const number = new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: options.compact ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `PLN\u00a0${number}`;
}
