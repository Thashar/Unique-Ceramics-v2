// Ruch na stronie – czyste funkcje (bez bazy i bez sieci), wspólne dla
// synchronizacji (`lib/traffic-store.ts`), widoku „na żywo"
// (`lib/traffic-overview.ts`) i strony `/admin/ruch`. Pokryte testami
// w `tests/traffic.test.ts`.
//
// Źródłem danych jest Vercel Web Analytics API (`lib/vercel-analytics.ts`).
// Dni liczymy w **UTC** – tak agreguje je Vercel; na czas polski przeliczamy
// dopiero przy pokazywaniu godzin i dni tygodnia.

import { WARSAW_TZ } from "@/lib/warsaw-time";

/**
 * Wymiary, którymi Vercel potrafi rozbić odsłony. Każdy z nich zapisujemy
 * codziennie do bazy – po to, żeby po wygaśnięciu miesięcznego okna planu
 * Hobby nadal dało się odpowiedzieć „skąd przyszli ludzie w marcu".
 */
export const TRAFFIC_DIMENSIONS = [
  "route",
  "requestPath",
  "referrerHostname",
  "country",
  "deviceType",
  "browserName",
  "osName",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmContent",
  "utmTerm",
] as const;

export type TrafficDimension = (typeof TRAFFIC_DIMENSIONS)[number];

/** Wymiary specjalne zapisywane obok powyższych: suma dnia i rozbicie godzinowe. */
export const TRAFFIC_TOTAL = "total";
export const TRAFFIC_HOUR = "hour";

export const DIMENSION_LABELS: Record<TrafficDimension, string> = {
  route: "Typy stron",
  requestPath: "Strony",
  referrerHostname: "Źródła wejść",
  country: "Kraje",
  deviceType: "Urządzenia",
  browserName: "Przeglądarki",
  osName: "Systemy",
  utmSource: "UTM – źródło",
  utmMedium: "UTM – medium",
  utmCampaign: "UTM – kampania",
  utmContent: "UTM – treść",
  utmTerm: "UTM – słowo kluczowe",
};

/** Okno raportowania planu Hobby – starszych dni API już nie odda. */
export const TRAFFIC_SYNC_WINDOW_DAYS = 30;
/** Ostatnie dni pobieramy zawsze od nowa – spóźnione zdarzenia dochodzą po fakcie. */
export const TRAFFIC_RESYNC_DAYS = 2;
/** Ile dni jedno uruchomienie synchronizacji obsłuży (15 zapytań na dzień, limit czasu funkcji). */
export const TRAFFIC_MAX_DAYS_PER_RUN = 4;
/** Maksymalna liczba wartości wymiaru, jaką odda jedno zapytanie (limit API). */
export const TRAFFIC_QUERY_LIMIT = 100;

/** Zakresy widoku „na żywo" – wszystkie mieszczą się w oknie Hobby. */
export const TRAFFIC_RANGES = [7, 14, 30] as const;
export type TrafficRange = (typeof TRAFFIC_RANGES)[number];

export function resolveTrafficRange(value: unknown): TrafficRange {
  const n = Number(value);
  return (TRAFFIC_RANGES as readonly number[]).includes(n) ? (n as TrafficRange) : 30;
}

// ── Daty (UTC) ────────────────────────────────────────────────────────────────

/** `YYYY-MM-DD` dnia w UTC. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Klucz dnia → `Date` o północy UTC (tak trzymamy `TrafficStat.date`). */
export function dayStart(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Ostatnia milisekunda dnia – `until` w zapytaniach o pojedynczy dzień. */
export function dayEnd(key: string): string {
  return `${key}T23:59:59.999Z`;
}

export function addDays(key: string, days: number): string {
  const d = dayStart(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dayKey(d);
}

/** Wszystkie dni od `from` do `to` włącznie (rosnąco). */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Które dni pobrać przy tym uruchomieniu synchronizacji.
 *
 * Najpierw ostatnie `resync` dni (bez dzisiaj – dzień jeszcze trwa), potem
 * brakujące dni z okna – **od najnowszych**, bo te najstarsze zaraz i tak
 * wypadną z okna i lepiej mieć świeże niż stare. Całość przycięta do `max`,
 * żeby jedno uruchomienie zmieściło się w limicie czasu funkcji.
 */
export function plannedSyncDays(opts: {
  now: Date;
  synced: Iterable<string>;
  window?: number;
  resync?: number;
  max?: number;
}): string[] {
  const window = opts.window ?? TRAFFIC_SYNC_WINDOW_DAYS;
  const resync = opts.resync ?? TRAFFIC_RESYNC_DAYS;
  const max = opts.max ?? TRAFFIC_MAX_DAYS_PER_RUN;
  const today = dayKey(opts.now);
  const synced = new Set(opts.synced);
  const plan: string[] = [];

  for (let i = 1; i <= resync; i++) plan.push(addDays(today, -i));
  for (const day of missingSyncDays({ now: opts.now, synced, window })) {
    if (!plan.includes(day)) plan.push(day);
  }
  return plan.slice(0, Math.max(0, max));
}

/** Dni z okna (bez dzisiaj), których jeszcze nie ma w bazie – od najnowszych. */
export function missingSyncDays(opts: {
  now: Date;
  synced: Iterable<string>;
  window?: number;
}): string[] {
  const window = opts.window ?? TRAFFIC_SYNC_WINDOW_DAYS;
  const today = dayKey(opts.now);
  const synced = new Set(opts.synced);
  const out: string[] = [];
  for (let i = 1; i <= window; i++) {
    const day = addDays(today, -i);
    if (!synced.has(day)) out.push(day);
  }
  return out;
}

// ── Liczby ────────────────────────────────────────────────────────────────────

/** Zmiana w procentach; `null`, gdy nie ma do czego porównać. */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function share(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// ── Czas polski ───────────────────────────────────────────────────────────────

const hourFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: WARSAW_TZ,
  hour: "2-digit",
  hourCycle: "h23",
});

const weekdayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: WARSAW_TZ,
  weekday: "short",
});

/** Godzina (0–23) w czasie polskim dla chwili podanej w ISO/UTC. */
export function warsawHour(iso: string | Date): number {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return Number(hourFmt.format(date));
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

export const WEEKDAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"] as const;

/** Dzień tygodnia (0 = poniedziałek) w czasie polskim. */
export function warsawWeekday(iso: string | Date): number {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return WEEKDAY_INDEX[weekdayFmt.format(date)] ?? 0;
}

export type TimeRow = { timestamp: string; pageviews: number; visitors: number };
export type Bucket = { index: number; label: string; pageviews: number; visitors: number };

/**
 * Wiersze godzinowe (UTC z API) → 24 koszyki wg godziny polskiej. Odwiedzający
 * to suma z koszyków – ta sama osoba o 9:00 i 21:00 liczy się dwa razy, ale
 * pytamy „kiedy ludzie wchodzą", nie „ilu ich jest".
 */
export function hourBuckets(rows: TimeRow[]): Bucket[] {
  const out: Bucket[] = Array.from({ length: 24 }, (_, i) => ({
    index: i, label: `${i}`, pageviews: 0, visitors: 0,
  }));
  for (const r of rows) {
    const b = out[warsawHour(r.timestamp)];
    b.pageviews += r.pageviews;
    b.visitors += r.visitors;
  }
  return out;
}

/** Wiersze dzienne → 7 koszyków wg dnia tygodnia (pon–nd, czas polski). */
export function weekdayBuckets(rows: TimeRow[]): Bucket[] {
  const out: Bucket[] = WEEKDAY_LABELS.map((label, i) => ({
    index: i, label, pageviews: 0, visitors: 0,
  }));
  for (const r of rows) {
    // Dzień z API to północ UTC; o 00:00 UTC w Polsce jest już 1:00/2:00 tego
    // samego dnia, więc dzień tygodnia się zgadza
    const b = out[warsawWeekday(r.timestamp)];
    b.pageviews += r.pageviews;
    b.visitors += r.visitors;
  }
  return out;
}

// ── Etykiety wartości ─────────────────────────────────────────────────────────

/** Nazwy stałych ścieżek sklepu – reszta (produkty, kategorie, projekty) idzie z bazy. */
export const STATIC_PATH_LABELS: Record<string, string> = {
  "/": "Strona główna",
  "/sklep": "Sklep",
  "/koszyk": "Koszyk",
  "/zamowienie": "Zamówienie",
  "/zamowienie/potwierdzenie": "Potwierdzenie zamówienia",
  "/zamowienie-indywidualne": "Zamówienie indywidualne",
  "/o-mnie": "O mnie",
  "/warsztaty": "Warsztaty",
  "/kontakt": "Kontakt",
  "/regulamin": "Regulamin",
  "/polityka-prywatnosci": "Polityka prywatności",
  "/moje-projekty": "Moje projekty",
  "/logowanie": "Logowanie",
  "/rejestracja": "Rejestracja",
  "/konto": "Konto klienta",
  "/zmiana-emaila": "Zmiana e-maila",
};

export const ROUTE_LABELS: Record<string, string> = {
  ...STATIC_PATH_LABELS,
  "/sklep/[slug]": "Karta produktu",
  "/sklep/kategoria/[slug]": "Strona kategorii",
  "/moje-projekty/[slug]": "Strona projektu",
  "/konto/zamowienia": "Konto – zamówienia",
  "/konto/zamowienia/[id]": "Konto – szczegóły zamówienia",
  "/konto/profil": "Konto – profil",
  "/konto/adres": "Konto – adres",
};

export type PathLabelSources = {
  /** slug produktu → nazwa */
  products?: Map<string, string>;
  /** slug kategorii → etykieta */
  categories?: Map<string, string>;
  /** slug projektu → tytuł */
  projects?: Map<string, string>;
};

export type PathKind = "product" | "category" | "project" | "admin" | "page";

/**
 * Ścieżki panelu admina – nie wysyłamy ich do Vercela (`SiteAnalytics`) i nie
 * pokazujemy w statystykach (odsłony zebrane, zanim filtr wszedł).
 */
export function isAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

/** Wiersze wymiarów ścieżkowych (`requestPath`, `route`) bez panelu admina. */
export function withoutAdmin<T extends { value: string }>(rows: T[]): T[] {
  return rows.filter((r) => !isAdminPath(r.value));
}

/** Slug produktu ze ścieżki `/sklep/{slug}` (bez stron kategorii); inaczej `null`. */
export function productSlugFromPath(path: string): string | null {
  const m = /^\/sklep\/([a-z0-9-]+)\/?$/.exec(path);
  if (!m || m[1] === "kategoria") return null;
  return m[1];
}

/**
 * Czytelna nazwa ścieżki: produkt, kategoria i projekt po nazwie z bazy, stałe
 * strony ze słownika, reszta jako surowa ścieżka. Nieznany slug produktu
 * (usunięty) zostaje ścieżką – lepsze to niż zgadywanie.
 */
export function pathLabel(path: string, sources: PathLabelSources = {}): { label: string; kind: PathKind } {
  const clean = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (isAdminPath(clean)) return { label: `Panel: ${clean.slice(6) || "/"}`, kind: "admin" };

  const productSlug = productSlugFromPath(clean);
  if (productSlug) {
    const name = sources.products?.get(productSlug);
    return { label: name ?? clean, kind: "product" };
  }
  const cat = /^\/sklep\/kategoria\/([a-z0-9-]+)$/.exec(clean);
  if (cat) {
    const label = sources.categories?.get(cat[1]);
    return { label: label ? `Kategoria: ${label}` : clean, kind: "category" };
  }
  const proj = /^\/moje-projekty\/([a-z0-9-]+)$/.exec(clean);
  if (proj) {
    const title = sources.projects?.get(proj[1]);
    return { label: title ? `Projekt: ${title}` : clean, kind: "project" };
  }
  return { label: STATIC_PATH_LABELS[clean] ?? clean, kind: "page" };
}

export const DEVICE_LABELS: Record<string, string> = {
  desktop: "Komputer",
  mobile: "Telefon",
  tablet: "Tablet",
};

let regionNames: Intl.DisplayNames | null = null;

/** Kod kraju (ISO 3166-1) → polska nazwa; nieznany kod zostaje kodem. */
export function countryLabel(code: string): string {
  if (!code) return "Nieznany";
  try {
    regionNames ??= new Intl.DisplayNames(["pl"], { type: "region" });
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Etykieta wartości wymiaru do pokazania w panelu. */
export function dimensionValueLabel(
  dimension: TrafficDimension,
  value: string,
  sources: PathLabelSources = {}
): string {
  if (value === "Others") return "Pozostałe";
  switch (dimension) {
    case "requestPath":
      return pathLabel(value, sources).label;
    case "route":
      return ROUTE_LABELS[value] ?? value;
    case "referrerHostname":
      return value === "" ? "Wejścia bezpośrednie / brak" : value;
    case "country":
      return countryLabel(value);
    case "deviceType":
      return DEVICE_LABELS[value] ?? (value || "Nieznane");
    default:
      return value === "" ? "(brak)" : value;
  }
}

// ── Historia (agregacja wierszy z bazy) ───────────────────────────────────────

export type StatRow = { date: string; dimension: string; value: string; pageviews: number; visitors: number };

export type MonthBucket = { year: number; month: number; label: string; pageviews: number; visitors: number; days: number };

const MONTH_LABELS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

/**
 * Sumy dzienne → miesiące. `visitors` to suma dziennych unikalnych
 * odwiedzających (Vercel liczy unikalność w obrębie dnia), więc osoba wracająca
 * co dzień liczy się w miesiącu kilka razy – w panelu nazywamy to wprost.
 */
export function monthBuckets(totals: Pick<StatRow, "date" | "pageviews" | "visitors">[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const r of totals) {
    const year = Number(r.date.slice(0, 4));
    const month = Number(r.date.slice(5, 7));
    const key = `${year}-${month}`;
    const b = map.get(key) ?? {
      year, month, label: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`,
      pageviews: 0, visitors: 0, days: 0,
    };
    b.pageviews += r.pageviews;
    b.visitors += r.visitors;
    b.days += 1;
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

export type DimTotal = { value: string; pageviews: number; visitors: number };

/** Wiersze jednego wymiaru z wielu dni → suma per wartość, malejąco po odsłonach. */
export function sumByValue(rows: Pick<StatRow, "value" | "pageviews" | "visitors">[], limit = 20): DimTotal[] {
  const map = new Map<string, DimTotal>();
  for (const r of rows) {
    const b = map.get(r.value) ?? { value: r.value, pageviews: 0, visitors: 0 };
    b.pageviews += r.pageviews;
    b.visitors += r.visitors;
    map.set(r.value, b);
  }
  return [...map.values()].sort((a, b) => b.pageviews - a.pageviews).slice(0, limit);
}

/** Wiersze `hour` z bazy (wartość = godzina UTC, data = dzień UTC) → koszyki godzin polskich. */
export function hourBucketsFromStats(rows: Pick<StatRow, "date" | "value" | "pageviews" | "visitors">[]): Bucket[] {
  return hourBuckets(
    rows.map((r) => ({
      timestamp: `${r.date}T${r.value.padStart(2, "0")}:00:00.000Z`,
      pageviews: r.pageviews,
      visitors: r.visitors,
    }))
  );
}
