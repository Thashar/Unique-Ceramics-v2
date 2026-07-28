// Rejestr zużycia AI (zdjęcia i opisy produktów) oraz statystyki do panelu.
// Zapis jest „best effort” – nieudany log nie może wywrócić generowania,
// bo wynik jest już wtedy wygenerowany i zapłacony.

import { db } from "@/lib/db";
import { aiCostUsd, type AiKind } from "@/lib/ai";

export type AiUsageBucket = { count: number; costUsd: number };

/** Zużycie w danym okresie z rozbiciem na zdjęcia i teksty. */
export type AiUsagePeriod = AiUsageBucket & {
  label: string;
  image: AiUsageBucket;
  text: AiUsageBucket;
};

export type AiUsageRow = {
  model: string;
  kind: AiKind;
  count: number;
  promptTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type AiUsageStats = {
  /** false = tabela zużycia niedostępna (brak migracji / baza w dół) */
  available: boolean;
  total: AiUsagePeriod;
  currentMonth: AiUsagePeriod;
  previousMonth: AiUsagePeriod;
  byModel: AiUsageRow[];
  byVariant: { variant: string; kind: AiKind; count: number; costUsd: number }[];
  /** Ile wpisów ma koszt z szacunku (API nie zwróciło liczników tokenów) */
  estimatedCount: number;
  lastUsedAt: string | null;
};

const emptyPeriod = (label = ""): AiUsagePeriod => ({
  label,
  count: 0,
  costUsd: 0,
  image: { count: 0, costUsd: 0 },
  text: { count: 0, costUsd: 0 },
});

const EMPTY_STATS: AiUsageStats = {
  available: false,
  total: emptyPeriod(),
  currentMonth: emptyPeriod(),
  previousMonth: emptyPeriod(),
  byModel: [],
  byVariant: [],
  estimatedCount: 0,
  lastUsedAt: null,
};

/** Zapisuje jedno udane wywołanie modelu. Błąd zapisu tylko loguje. */
export async function recordAiUsage(entry: {
  kind: AiKind;
  variant: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  estimated: boolean;
}): Promise<void> {
  try {
    await db.aiImageUsage.create({
      data: {
        kind: entry.kind,
        variant: entry.variant,
        model: entry.model,
        promptTokens: entry.promptTokens,
        outputTokens: entry.outputTokens,
        costUsd: aiCostUsd(entry.model, entry.promptTokens, entry.outputTokens),
        estimated: entry.estimated,
      },
    });
  } catch (e) {
    console.error("[ai-usage] zapis zużycia:", e);
  }
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(date);
}

const round = (v: number) => Math.round(v * 1_000_000) / 1_000_000;

function addTo(period: AiUsagePeriod, kind: AiKind, costUsd: number) {
  period.count += 1;
  period.costUsd += costUsd;
  period[kind].count += 1;
  period[kind].costUsd += costUsd;
}

function roundPeriod(period: AiUsagePeriod): AiUsagePeriod {
  return {
    ...period,
    costUsd: round(period.costUsd),
    image: { ...period.image, costUsd: round(period.image.costUsd) },
    text: { ...period.text, costUsd: round(period.text.costUsd) },
  };
}

/**
 * Zbiorcze statystyki zużycia. Przy niedostępnej bazie (albo braku migracji)
 * zwraca `available: false` – panel pokaże wtedy instrukcję zamiast zer.
 */
export async function getAiUsageStats(): Promise<AiUsageStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  try {
    const rows = await db.aiImageUsage.findMany({
      select: {
        createdAt: true,
        kind: true,
        variant: true,
        model: true,
        promptTokens: true,
        outputTokens: true,
        costUsd: true,
        estimated: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const byModel = new Map<string, AiUsageRow>();
    const byVariant = new Map<string, { variant: string; kind: AiKind; count: number; costUsd: number }>();
    const total = emptyPeriod("Łącznie");
    const currentMonth = emptyPeriod(monthLabel(now));
    const previousMonth = emptyPeriod(monthLabel(prevStart));
    let estimatedCount = 0;

    for (const row of rows) {
      // Stare wpisy (sprzed rozdzielenia kosztów) nie mają rodzaju – to zdjęcia
      const kind: AiKind = row.kind === "text" ? "text" : "image";

      addTo(total, kind, row.costUsd);
      if (row.createdAt >= monthStart) addTo(currentMonth, kind, row.costUsd);
      else if (row.createdAt >= prevStart) addTo(previousMonth, kind, row.costUsd);
      if (row.estimated) estimatedCount += 1;

      const model = byModel.get(row.model) ?? {
        model: row.model,
        kind,
        count: 0,
        promptTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
      model.count += 1;
      model.promptTokens += row.promptTokens;
      model.outputTokens += row.outputTokens;
      model.costUsd += row.costUsd;
      byModel.set(row.model, model);

      const variant = byVariant.get(row.variant) ?? {
        variant: row.variant,
        kind,
        count: 0,
        costUsd: 0,
      };
      variant.count += 1;
      variant.costUsd += row.costUsd;
      byVariant.set(row.variant, variant);
    }

    return {
      available: true,
      total: roundPeriod(total),
      currentMonth: roundPeriod(currentMonth),
      previousMonth: roundPeriod(previousMonth),
      byModel: [...byModel.values()]
        .map((m) => ({ ...m, costUsd: round(m.costUsd) }))
        .sort((a, b) => b.count - a.count),
      byVariant: [...byVariant.values()]
        .map((v) => ({ ...v, costUsd: round(v.costUsd) }))
        .sort((a, b) => b.count - a.count),
      estimatedCount,
      lastUsedAt: rows[0]?.createdAt.toISOString() ?? null,
    };
  } catch (e) {
    console.error("[ai-usage] odczyt statystyk:", e);
    return EMPTY_STATS;
  }
}
