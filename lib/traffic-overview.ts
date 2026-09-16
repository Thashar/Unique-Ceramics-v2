// Ruch na stronie „na żywo" – ostatnie 7/14/30 dni prosto z API Vercela
// (tylko serwer). Wynik siedzi w `unstable_cache` na 15 minut, bo jeden widok
// to 15 zapytań do API, a wejść w panel bywa kilka pod rząd.
//
// Historia dłuższa niż okno planu idzie z naszej bazy – patrz
// `lib/traffic-store.ts`; ten moduł odpowiada tylko za bieżący zakres.

import { unstable_cache } from "next/cache";
import { queryVisits, rowValue, trafficConfig, type ApiResult, type VisitRow } from "@/lib/vercel-analytics";
import {
  TRAFFIC_DIMENSIONS,
  TRAFFIC_QUERY_LIMIT,
  addDays,
  dayEnd,
  dayKey,
  dayRange,
  type DimTotal,
  type TimeRow,
  type TrafficDimension,
  type TrafficRange,
} from "@/lib/traffic";

export type TrafficOverview = {
  configured: boolean;
  /** Błąd głównego zapytania (suma dzienna) – bez niego reszta nie ma sensu. */
  error: string | null;
  days: TrafficRange;
  since: string;
  until: string;
  totals: { pageviews: number; visitors: number };
  /** Poprzedni okres tej samej długości; `null`, gdy wypada poza okno planu. */
  previous: { pageviews: number; visitors: number } | null;
  /** Jeden wiersz na dzień zakresu – dni bez ruchu mają zera. */
  daily: TimeRow[];
  /** Wiersze godzinowe (UTC) z całego zakresu – do koszyków wg godziny polskiej. */
  hourly: TimeRow[];
  dims: Record<TrafficDimension, DimTotal[]>;
  /** Wymiary, których nie udało się pobrać (komunikat po polsku). */
  dimErrors: Partial<Record<TrafficDimension, string>>;
};

function sum(rows: VisitRow[]) {
  return rows.reduce(
    (acc, r) => ({ pageviews: acc.pageviews + r.pageviews, visitors: acc.visitors + r.visitors }),
    { pageviews: 0, visitors: 0 }
  );
}

function timeRows(rows: VisitRow[]): TimeRow[] {
  return rows
    .filter((r): r is VisitRow & { timestamp: string } => typeof r.timestamp === "string")
    .map((r) => ({ timestamp: r.timestamp, pageviews: r.pageviews, visitors: r.visitors }));
}

/** Uzupełnia brakujące dni zerami – wykres ma pokazać pustkę, nie ją ukryć. */
function fillDaily(rows: TimeRow[], since: string, until: string): TimeRow[] {
  const byDay = new Map(rows.map((r) => [r.timestamp.slice(0, 10), r]));
  return dayRange(since, until).map((day) => {
    const r = byDay.get(day);
    return { timestamp: `${day}T00:00:00.000Z`, pageviews: r?.pageviews ?? 0, visitors: r?.visitors ?? 0 };
  });
}

function emptyOverview(days: TrafficRange, since: string, until: string, error: string | null, configured: boolean): TrafficOverview {
  return {
    configured,
    error,
    days,
    since,
    until,
    totals: { pageviews: 0, visitors: 0 },
    previous: null,
    daily: [],
    hourly: [],
    dims: Object.fromEntries(TRAFFIC_DIMENSIONS.map((d) => [d, [] as DimTotal[]])) as Record<TrafficDimension, DimTotal[]>,
    dimErrors: {},
  };
}

async function buildOverview(days: TrafficRange, now: Date): Promise<TrafficOverview> {
  const config = trafficConfig();
  const today = dayKey(now);
  const since = addDays(today, -(days - 1));
  const until = dayEnd(today);

  if (!config) return emptyOverview(days, since, today, null, false);

  const range = { since, until };
  const prevRange = { since: addDays(since, -days), until: dayEnd(addDays(since, -1)) };

  // Zapytania idą równolegle – to zewnętrzne API, nie nasza pula bazy
  const [dailyRes, prevRes, hourlyRes, ...dimRes] = await Promise.all([
    queryVisits({ ...range, by: "day" }, config),
    queryVisits({ ...prevRange, by: "day" }, config),
    queryVisits({ ...range, by: "hour" }, config),
    ...TRAFFIC_DIMENSIONS.map((by) => queryVisits({ ...range, by, limit: TRAFFIC_QUERY_LIMIT }, config)),
  ]);

  if (!dailyRes.ok) return emptyOverview(days, since, today, dailyRes.error, true);

  const dims = {} as Record<TrafficDimension, DimTotal[]>;
  const dimErrors: Partial<Record<TrafficDimension, string>> = {};
  TRAFFIC_DIMENSIONS.forEach((dimension, i) => {
    const res: ApiResult<VisitRow[]> = dimRes[i];
    if (!res.ok) {
      dims[dimension] = [];
      dimErrors[dimension] = res.error;
      return;
    }
    dims[dimension] = res.data
      .map((r) => ({ value: rowValue(r, dimension), pageviews: r.pageviews, visitors: r.visitors }))
      .sort((a, b) => b.pageviews - a.pageviews);
  });

  return {
    configured: true,
    error: null,
    days,
    since,
    until: today,
    totals: sum(dailyRes.data),
    // Poprzedni okres przy 30 dniach wypada poza okno Hobby – wtedy API
    // odpowiada błędem i porównania po prostu nie pokazujemy
    previous: prevRes.ok ? sum(prevRes.data) : null,
    daily: fillDaily(timeRows(dailyRes.data), since, today),
    hourly: hourlyRes.ok ? timeRows(hourlyRes.data) : [],
    dims,
    dimErrors,
  };
}

/**
 * Widok na żywo z cache 15 min (tag `traffic`). Klucz zawiera zakres i dzień –
 * po północy UTC zakres się przesuwa, więc wczorajszy wpis nie może zostać.
 */
export async function getTrafficOverview(days: TrafficRange): Promise<TrafficOverview> {
  const now = new Date();
  const cached = unstable_cache(
    () => buildOverview(days, now),
    ["traffic-overview", String(days), dayKey(now)],
    { revalidate: 900, tags: ["traffic"] }
  );
  return cached();
}
