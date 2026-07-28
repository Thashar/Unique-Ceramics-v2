// Rejestr zużycia AI (generowanie zdjęć produktów) i statystyki do panelu.
// Zapis jest „best effort” – nieudany log nie może wywrócić generowania,
// bo zdjęcie jest już wtedy wygenerowane i zapłacone.

import { db } from "@/lib/db";
import { aiCostUsd, type AiVariant } from "@/lib/ai-image";

export type AiUsageRow = {
  model: string;
  count: number;
  promptTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type AiUsageStats = {
  /** false = tabela zużycia niedostępna (brak migracji / baza w dół) */
  available: boolean;
  total: { count: number; costUsd: number };
  currentMonth: { count: number; costUsd: number; label: string };
  previousMonth: { count: number; costUsd: number; label: string };
  byModel: AiUsageRow[];
  byVariant: { variant: AiVariant; count: number; costUsd: number }[];
  /** Ile wpisów ma koszt z szacunku (API nie zwróciło liczników tokenów) */
  estimatedCount: number;
  lastUsedAt: string | null;
};

const EMPTY_STATS: AiUsageStats = {
  available: false,
  total: { count: 0, costUsd: 0 },
  currentMonth: { count: 0, costUsd: 0, label: "" },
  previousMonth: { count: 0, costUsd: 0, label: "" },
  byModel: [],
  byVariant: [],
  estimatedCount: 0,
  lastUsedAt: null,
};

/** Zapisuje jedno udane generowanie. Błąd zapisu tylko loguje. */
export async function recordAiUsage(entry: {
  variant: AiVariant;
  model: string;
  promptTokens: number;
  outputTokens: number;
  estimated: boolean;
}): Promise<void> {
  try {
    await db.aiImageUsage.create({
      data: {
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
    const byVariant = new Map<string, { variant: AiVariant; count: number; costUsd: number }>();
    let totalCost = 0;
    let monthCount = 0;
    let monthCost = 0;
    let prevCount = 0;
    let prevCost = 0;
    let estimatedCount = 0;

    for (const row of rows) {
      totalCost += row.costUsd;
      if (row.estimated) estimatedCount += 1;

      if (row.createdAt >= monthStart) {
        monthCount += 1;
        monthCost += row.costUsd;
      } else if (row.createdAt >= prevStart) {
        prevCount += 1;
        prevCost += row.costUsd;
      }

      const model = byModel.get(row.model) ?? {
        model: row.model,
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
        variant: row.variant as AiVariant,
        count: 0,
        costUsd: 0,
      };
      variant.count += 1;
      variant.costUsd += row.costUsd;
      byVariant.set(row.variant, variant);
    }

    return {
      available: true,
      total: { count: rows.length, costUsd: round(totalCost) },
      currentMonth: { count: monthCount, costUsd: round(monthCost), label: monthLabel(now) },
      previousMonth: { count: prevCount, costUsd: round(prevCost), label: monthLabel(prevStart) },
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
