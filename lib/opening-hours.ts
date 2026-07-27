/**
 * Zamiana godzin otwarcia z ustawienia `contact_hours` (tekst wpisywany
 * w panelu admina, np. „Wt–Czw 17:00–19:00, So 15:00–17:00") na
 * `openingHoursSpecification` wg schema.org – dane strukturalne dla Google.
 *
 * Wejście jest polem tekstowym, więc parser celowo jest zachowawczy:
 * fragmentu, którego nie rozumie, po prostu nie zwraca. Lepiej pominąć
 * godziny w JSON-LD niż podać wyszukiwarce błędne.
 */

export type OpeningHoursSpec = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string[];
  opens: string;
  closes: string;
};

const WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Skróty dni po polsku → indeks w tygodniu (0 = poniedziałek)
const DAYS: Record<string, number> = {
  pon: 0, po: 0, poniedzialek: 0,
  wt: 1, wtorek: 1,
  sr: 2, sroda: 2, srod: 2,
  czw: 3, cz: 3, czwartek: 3,
  pt: 4, pi: 4, piatek: 4,
  so: 5, sob: 5, sobota: 5,
  nd: 6, niedz: 6, ndz: 6, niedziela: 6,
};

/** Normalizuje skrót dnia: małe litery, bez ogonków i kropek. */
function dayKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź|ż/g, "z")
    .trim();
}

/** „17:00" / „9.00" / „9" → „17:00" / „09:00"; null gdy niepoprawne. */
function normalizeTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** „Wt–Czw" → [Tuesday, Wednesday, Thursday]; „So" → [Saturday]. */
function parseDays(raw: string): string[] {
  const parts = raw.split(/\s*[––-]\s*/).map(dayKey).filter(Boolean);
  if (parts.length === 1) {
    const i = DAYS[parts[0]];
    return i === undefined ? [] : [WEEK[i]];
  }
  if (parts.length === 2) {
    const from = DAYS[parts[0]];
    const to = DAYS[parts[1]];
    if (from === undefined || to === undefined) return [];
    const out: string[] = [];
    // Zakres może przechodzić przez niedzielę (np. „Pt–Wt")
    for (let i = from; ; i = (i + 1) % 7) {
      out.push(WEEK[i]);
      if (i === to || out.length > 7) break;
    }
    return out;
  }
  return [];
}

/**
 * Sprowadza godziny do postaci z prawdziwymi znakami nowego wiersza.
 * Pole w panelu jest wieloliniowe (Enter), ale wcześniej dało się tam wpisać
 * `<br>` – taki zapis honorujemy jako złamanie wiersza zamiast pokazywać
 * użytkownikowi surowy znacznik. HTML NIE jest renderowany.
 */
export function normalizeHours(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n").trim();
}

export function parseOpeningHours(text: string): OpeningHoursSpec[] {
  if (!text) return [];
  const out: OpeningHoursSpec[] = [];

  // Wpisy rozdziela przecinek, średnik albo nowy wiersz (pole w panelu
  // admina jest wieloliniowe – Enter łamie wiersz także w stopce)
  for (const chunk of normalizeHours(text).split(/[,;\n]/)) {
    const m = chunk
      .trim()
      .match(/^(.+?)\s+(\d{1,2}(?:[:.]\d{2})?)\s*[––-]\s*(\d{1,2}(?:[:.]\d{2})?)$/);
    if (!m) continue;

    const dayOfWeek = parseDays(m[1]);
    const opens = normalizeTime(m[2]);
    const closes = normalizeTime(m[3]);
    if (!dayOfWeek.length || !opens || !closes) continue;

    out.push({ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes });
  }

  return out;
}

/**
 * Rozbija „44-164 Kleszczów (k. Gliwic)" na kod pocztowy i miejscowość.
 * Dopisek w nawiasie jest pomijany – w JSON-LD ma być sama nazwa miasta.
 */
export function parseCityLine(line: string): { postalCode?: string; locality: string } {
  const trimmed = line.trim();
  const m = trimmed.match(/^(\d{2}-\d{3})\s+(.+)$/);
  const rest = (m ? m[2] : trimmed).replace(/\s*\([^)]*\)\s*$/, "").trim();
  return { postalCode: m?.[1], locality: rest };
}
