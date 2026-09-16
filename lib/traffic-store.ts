// Ruch na stronie – zapis i odczyt historii w bazie (tylko serwer).
//
// Vercel na planie Hobby trzyma dane przez miesiąc, więc codziennie (cron
// `/api/ping`, a ręcznie przyciskiem w `/admin/ruch`) pobieramy wczorajszy
// dzień we **wszystkich** wymiarach i zapisujemy do `TrafficStat`. Po roku
// mamy rok historii, choć Vercel widzi tylko ostatnie 30 dni.
//
// Migracja jest ręczna (`manual_add_traffic_stats.sql`), więc **każdy odczyt
// jest w try/catch** – brak tabeli nie może wywrócić panelu; strona pokazuje
// wtedy dane na żywo z API i instrukcję migracji zamiast historii.

import { db } from "@/lib/db";
import { queryVisits, rowValue, trafficConfig, type VisitRow } from "@/lib/vercel-analytics";
import {
  TRAFFIC_DIMENSIONS,
  TRAFFIC_HOUR,
  TRAFFIC_MAX_DAYS_PER_RUN,
  TRAFFIC_QUERY_LIMIT,
  TRAFFIC_TOTAL,
  dayEnd,
  dayKey,
  dayStart,
  missingSyncDays,
  plannedSyncDays,
  type StatRow,
} from "@/lib/traffic";

// ── Stan synchronizacji ───────────────────────────────────────────────────────

export type SyncState = {
  /** `false` = brak tabeli w bazie (migracja niewykonana). */
  available: boolean;
  /** Dni (`YYYY-MM-DD`) z zapisaną sumą – czyli zsynchronizowane. */
  days: string[];
  lastSyncedAt: Date | null;
};

export async function getSyncState(): Promise<SyncState> {
  try {
    const rows = await db.trafficStat.findMany({
      where: { dimension: TRAFFIC_TOTAL },
      select: { date: true, syncedAt: true },
      orderBy: { date: "asc" },
    });
    let lastSyncedAt: Date | null = null;
    for (const r of rows) {
      if (!lastSyncedAt || r.syncedAt > lastSyncedAt) lastSyncedAt = r.syncedAt;
    }
    return { available: true, days: rows.map((r) => dayKey(r.date)), lastSyncedAt };
  } catch (e) {
    console.error("[traffic-store] odczyt stanu synchronizacji nieudany:", e);
    return { available: false, days: [], lastSyncedAt: null };
  }
}

// ── Zapis jednego dnia ────────────────────────────────────────────────────────

type PendingRow = { dimension: string; value: string; pageviews: number; visitors: number };

/** Godzina UTC z `timestamp` wiersza godzinowego → "00"–"23". */
function hourValue(row: VisitRow): string {
  const ts = row.timestamp ?? "";
  const m = /T(\d{2}):/.exec(ts);
  return m ? m[1] : "00";
}

/**
 * Podmienia wiersze jednego wymiaru z jednego dnia. Kasowanie i wstawianie
 * w jednej transakcji – powtórna synchronizacja (spóźnione zdarzenia) nie może
 * zostawić dnia w połowie zapisanego.
 */
async function replaceRows(date: Date, dimension: string, rows: PendingRow[], syncedAt: Date) {
  await db.$transaction([
    db.trafficStat.deleteMany({ where: { date, dimension } }),
    ...(rows.length
      ? [db.trafficStat.createMany({
          data: rows.map((r) => ({ date, dimension: r.dimension, value: r.value, pageviews: r.pageviews, visitors: r.visitors, syncedAt })),
          skipDuplicates: true,
        })]
      : []),
  ]);
}

export type DaySyncResult = { day: string; ok: boolean; requests: number; error?: string };

/**
 * Pobiera z API i zapisuje jeden dzień: sumę (`total`), rozbicie godzinowe
 * (`hour`) i każdy wymiar z `TRAFFIC_DIMENSIONS` – 15 zapytań. Zapytania idą
 * **sekwencyjnie**, żeby nie zalać API Vercela; suma dnia zapisywana jest
 * **na końcu**, bo jej obecność znaczy „dzień kompletny".
 */
export async function syncTrafficDay(day: string, now = new Date()): Promise<DaySyncResult> {
  const config = trafficConfig();
  if (!config) return { day, ok: false, requests: 0, error: "Brak konfiguracji Vercel Analytics." };

  const date = dayStart(day);
  const range = { since: day, until: dayEnd(day) };
  let requests = 0;

  try {
    // Suma dnia – potrzebna od razu, żeby wiedzieć, czy w ogóle jest co zapisywać
    const totalRes = await queryVisits({ ...range, by: "day" }, config);
    requests++;
    if (!totalRes.ok) return { day, ok: false, requests, error: totalRes.error };
    const total = totalRes.data.reduce(
      (acc, r) => ({ pageviews: acc.pageviews + r.pageviews, visitors: acc.visitors + r.visitors }),
      { pageviews: 0, visitors: 0 }
    );

    const hourRes = await queryVisits({ ...range, by: "hour" }, config);
    requests++;
    if (!hourRes.ok) return { day, ok: false, requests, error: hourRes.error };
    await replaceRows(
      date,
      TRAFFIC_HOUR,
      hourRes.data
        .filter((r) => r.pageviews > 0 || r.visitors > 0)
        .map((r) => ({ dimension: TRAFFIC_HOUR, value: hourValue(r), pageviews: r.pageviews, visitors: r.visitors })),
      now
    );

    for (const dimension of TRAFFIC_DIMENSIONS) {
      const res = await queryVisits({ ...range, by: dimension, limit: TRAFFIC_QUERY_LIMIT }, config);
      requests++;
      if (!res.ok) return { day, ok: false, requests, error: `${dimension}: ${res.error}` };
      // Ta sama wartość nie powinna wystąpić dwa razy, ale unikalny indeks
      // by to odrzucił – scalamy na wszelki wypadek
      const merged = new Map<string, PendingRow>();
      for (const r of res.data) {
        const value = rowValue(r, dimension);
        const cur = merged.get(value) ?? { dimension, value, pageviews: 0, visitors: 0 };
        cur.pageviews += r.pageviews;
        cur.visitors += r.visitors;
        merged.set(value, cur);
      }
      await replaceRows(date, dimension, [...merged.values()], now);
    }

    await replaceRows(date, TRAFFIC_TOTAL, [{ dimension: TRAFFIC_TOTAL, value: "", ...total }], now);
    return { day, ok: true, requests };
  } catch (e) {
    console.error(`[traffic-store] synchronizacja dnia ${day} nieudana:`, e);
    return { day, ok: false, requests, error: "Zapis do bazy nieudany – sprawdź, czy tabela TrafficStat istnieje." };
  }
}

// ── Cała synchronizacja ───────────────────────────────────────────────────────

export type SyncReport = {
  /** `unconfigured` = brak tokenu, `no-table` = brak migracji, `null` = wykonano. */
  skipped: "unconfigured" | "no-table" | null;
  results: DaySyncResult[];
  /** Ile dni z okna nadal brakuje – klient wywołuje synchronizację, aż będzie 0. */
  remaining: number;
};

/**
 * Jedno uruchomienie: ostatnie dni od nowa + brakujące z okna, do `maxDays`
 * (patrz `plannedSyncDays`). Wołane z crona i z przycisku w panelu.
 */
export async function runTrafficSync(opts: { maxDays?: number; now?: Date } = {}): Promise<SyncReport> {
  const now = opts.now ?? new Date();
  if (!trafficConfig()) return { skipped: "unconfigured", results: [], remaining: 0 };

  const state = await getSyncState();
  if (!state.available) return { skipped: "no-table", results: [], remaining: 0 };

  const synced = new Set(state.days);
  const plan = plannedSyncDays({ now, synced, max: opts.maxDays ?? TRAFFIC_MAX_DAYS_PER_RUN });
  const results: DaySyncResult[] = [];
  for (const day of plan) {
    const result = await syncTrafficDay(day, now);
    results.push(result);
    if (result.ok) synced.add(day);
    // Błąd API (np. limit zapytań) powtórzy się przy kolejnych dniach – nie
    // ma sensu dobijać limitu, cron spróbuje jutro
    if (!result.ok && result.error && /429|połączyć/.test(result.error)) break;
  }

  return { skipped: null, results, remaining: missingSyncDays({ now, synced }).length };
}

// ── Historia ──────────────────────────────────────────────────────────────────

/** Ile wierszy wciągamy na stronę historii – rok to ~365 × (kilkadziesiąt wartości) na wymiar. */
const HISTORY_ROW_LIMIT = 200_000;

export type TrafficHistory = {
  available: boolean;
  rows: StatRow[];
  firstDay: string | null;
  lastDay: string | null;
  dayCount: number;
};

/**
 * Wszystkie zapisane wiersze wybranych wymiarów. Agregaty (miesiące, top
 * wartości, godziny) liczy strona helperami z `lib/traffic.ts` – tabela ma
 * dziesiątki tysięcy wierszy najwyżej po latach, a i tak potrzebujemy wielu
 * rozbić z tych samych danych.
 */
export async function getTrafficHistory(dimensions: string[]): Promise<TrafficHistory> {
  try {
    const rows = await db.trafficStat.findMany({
      where: { dimension: { in: dimensions } },
      select: { date: true, dimension: true, value: true, pageviews: true, visitors: true },
      orderBy: { date: "asc" },
      take: HISTORY_ROW_LIMIT,
    });
    const mapped: StatRow[] = rows.map((r) => ({ ...r, date: dayKey(r.date) }));
    const totals = mapped.filter((r) => r.dimension === TRAFFIC_TOTAL);
    return {
      available: true,
      rows: mapped,
      firstDay: totals[0]?.date ?? null,
      lastDay: totals[totals.length - 1]?.date ?? null,
      dayCount: totals.length,
    };
  } catch (e) {
    console.error("[traffic-store] odczyt historii nieudany:", e);
    return { available: false, rows: [], firstDay: null, lastDay: null, dayCount: 0 };
  }
}
