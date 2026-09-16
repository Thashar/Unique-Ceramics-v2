// Klient Vercel Web Analytics API (tylko serwer).
//
// Czyta te same zagregowane dane, które pokazuje dashboard Vercela:
// `GET https://api.vercel.com/v1/query/web-analytics/visits/aggregate`.
// Token dostępowy nigdy nie trafia do klienta – używają go wyłącznie
// `lib/traffic-overview.ts` (widok na żywo) i `lib/traffic-store.ts`
// (codzienny zapis do bazy).
//
// Konfiguracja (`.env`):
//   VERCEL_ANALYTICS_TOKEN      – token z https://vercel.com/account/tokens
//   VERCEL_ANALYTICS_PROJECT_ID – `prj_…` (Settings → General projektu) albo nazwa projektu
//   VERCEL_ANALYTICS_TEAM_ID    – `team_…`, tylko gdy projekt należy do zespołu
//
// Ograniczenia planu Hobby: okno raportowania **1 miesiąc** (starsze `since`
// dostaje błąd), 50 000 zdarzeń/mies., bez własnych zdarzeń. Dlatego historię
// trzymamy u siebie (`TrafficStat`).

const API_BASE = "https://api.vercel.com/v1/query/web-analytics";
const TIMEOUT_MS = 20_000;

export type TrafficConfig = { token: string; projectId: string; teamId: string | null };

export function trafficConfig(): TrafficConfig | null {
  const token = process.env.VERCEL_ANALYTICS_TOKEN?.trim();
  const projectId = (process.env.VERCEL_ANALYTICS_PROJECT_ID ?? process.env.VERCEL_PROJECT_ID)?.trim();
  if (!token || !projectId) return null;
  const teamId = process.env.VERCEL_ANALYTICS_TEAM_ID?.trim() || null;
  return { token, projectId, teamId };
}

export function isTrafficConfigured(): boolean {
  return trafficConfig() !== null;
}

/** Wiersz odpowiedzi – oprócz liczników ma klucz wymiaru (`country`, `requestPath`…) albo `timestamp`. */
export type VisitRow = {
  pageviews: number;
  visitors: number;
  timestamp?: string;
} & Record<string, unknown>;

export type VisitsQuery = {
  /** Jeden wymiar: granulacja czasu (`hour`/`day`/`month`) albo wymiar z `TRAFFIC_DIMENSIONS`. */
  by: string;
  /** `YYYY-MM-DD` albo pełne ISO. */
  since: string;
  until: string;
  /** 1–100 (domyślnie 10 w API) – reszta wartości ląduje w grupie „Others". */
  limit?: number;
  /** Filtr OData, np. `requestPath eq '/sklep'`. */
  filter?: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

/** Komunikat po polsku dla najczęstszych odpowiedzi API. */
function describeError(status: number, body: unknown): string {
  const message =
    typeof body === "object" && body !== null && "error" in body
      ? String((body as { error: { message?: string } }).error?.message ?? "")
      : "";
  switch (status) {
    case 400:
      return `Vercel odrzucił zapytanie (400)${message ? `: ${message}` : ""} – najczęściej zakres dat wykracza poza okno raportowania planu.`;
    case 401:
      return "Token Vercela jest nieprawidłowy albo wygasł (401).";
    case 402:
      return "Plan Vercela nie obejmuje tej funkcji (402).";
    case 403:
      return "Token nie ma dostępu do tego projektu (403) – sprawdź zakres tokenu i VERCEL_ANALYTICS_TEAM_ID.";
    case 404:
      return "Vercel nie znalazł projektu albo Web Analytics nie jest w nim włączone (404).";
    case 429:
      return "Za dużo zapytań do API Vercela (429) – spróbuj za chwilę.";
    default:
      return `Błąd API Vercela (${status})${message ? `: ${message}` : ""}.`;
  }
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * `visits/aggregate` – odsłony i odwiedzający rozbite jednym wymiarem.
 * Zawsze `cache: "no-store"`: cache trzyma wyżej `unstable_cache` w widoku
 * na żywo, a synchronizacja ma dostać świeże dane.
 */
export async function queryVisits(q: VisitsQuery, config = trafficConfig()): Promise<ApiResult<VisitRow[]>> {
  if (!config) return { ok: false, status: 0, error: "Brak konfiguracji Vercel Analytics (token / projectId)." };

  const params = new URLSearchParams({
    projectId: config.projectId,
    by: q.by,
    since: q.since,
    until: q.until,
  });
  if (q.limit) params.set("limit", String(q.limit));
  if (q.filter) params.set("filter", q.filter);
  if (config.teamId) params.set("teamId", config.teamId);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/visits/aggregate?${params}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[vercel-analytics] żądanie nieudane:", e);
    return { ok: false, status: 0, error: "Nie udało się połączyć z API Vercela." };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // brak JSON-a – obsłużone niżej przez status
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: describeError(res.status, body) };
  }

  const rows = typeof body === "object" && body !== null && Array.isArray((body as { data?: unknown }).data)
    ? ((body as { data: Record<string, unknown>[] }).data)
    : [];

  return {
    ok: true,
    data: rows.map((r) => ({
      ...r,
      pageviews: toNumber(r.pageviews),
      visitors: toNumber(r.visitors),
      timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
    })),
  };
}

/**
 * Wartość wymiaru z wiersza. API oddaje ją pod nazwą wymiaru
 * (`{ country: "PL", … }`); brak/`null` (np. wejście bez referrera) zamieniamy
 * na pusty string, żeby dało się go zapisać jako klucz.
 */
export function rowValue(row: VisitRow, dimension: string): string {
  const v = row[dimension];
  if (v === null || v === undefined) return "";
  return String(v);
}
