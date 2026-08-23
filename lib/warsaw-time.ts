// Czas polski (Europe/Warsaw) w polach dat panelu admina.
//
// Baza i serwer pracują na UTC, a właściciel sklepu myśli w czasie polskim:
// „rabat do 24.08 o 18:00" ma znaczyć 18:00 w Polsce – niezależnie od tego,
// gdzie stoi serwer i czy akurat trwa czas letni. Moduł jest neutralny
// (same funkcje na Intl, bez bazy) – używa go walidacja serwerowa,
// formularz produktu i strony sklepu.

export const WARSAW_TZ = "Europe/Warsaw";

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: WARSAW_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const READABLE = new Intl.DateTimeFormat("pl-PL", {
  timeZone: WARSAW_TZ,
  hourCycle: "h23",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const READABLE_SHORT = new Intl.DateTimeFormat("pl-PL", {
  timeZone: WARSAW_TZ,
  hourCycle: "h23",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type WarsawFields = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function warsawFields(date: Date): WarsawFields {
  const out: Record<string, string> = {};
  for (const part of PARTS.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

/** Przesunięcie strefy w danej chwili (ms) – +1 h zimą, +2 h latem. */
function warsawOffsetMs(date: Date): number {
  const f = warsawFields(date);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  // Sekundy z Intl nie mają milisekund – porównujemy pełne sekundy
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** Dowolna postać daty (Date / ISO string / null) sprowadzona do Date. */
export function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * „YYYY-MM-DDTHH:mm" z pola `datetime-local` odczytane **jako czas polski**
 * i zamienione na moment w czasie (UTC). Offset zależy od chwili, którą
 * dopiero liczymy (czas letni/zimowy), więc liczymy go dwa razy – drugie
 * podejście trafia także w dni zmiany czasu.
 */
export function warsawLocalToDate(local: unknown): Date | null {
  if (typeof local !== "string") return null;
  const m = LOCAL_RE.exec(local.trim());
  if (!m) return null;
  const naive = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    m[6] ? Number(m[6]) : 0
  );
  if (!Number.isFinite(naive)) return null;
  let utc = naive - warsawOffsetMs(new Date(naive));
  utc = naive - warsawOffsetMs(new Date(utc));
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Wartość dla `<input type="datetime-local">` – czas polski, bez sekund. */
export function dateToWarsawLocal(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  const f = warsawFields(date);
  return `${f.year}-${pad(f.month)}-${pad(f.day)}T${pad(f.hour)}:${pad(f.minute)}`;
}

/** Teraz w formacie pola `datetime-local` (czas polski). */
export function warsawNowLocal(now: Date = new Date()): string {
  return dateToWarsawLocal(now);
}

/**
 * Czytelna data w czasie polskim: „24.08.2026, 18:00" albo – w wariancie
 * skróconym – „24.08, 18:00" (bez roku, do drobnych dopisków w sklepie).
 */
export function formatWarsaw(
  value: Date | string | null | undefined,
  { short = false }: { short?: boolean } = {}
): string {
  const date = toDate(value);
  if (!date) return "";
  return (short ? READABLE_SHORT : READABLE).format(date);
}
