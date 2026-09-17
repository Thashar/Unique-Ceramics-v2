import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, withDbRetry } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_AGENT_MODEL_SETTING_KEY,
  AI_CARD_VARIANT,
  AI_TEXT_LIMITS,
  AI_TEXT_MODEL_SETTING_KEY,
  AI_TEXT_VARIANT,
  agentVariant,
  aiCostUsd,
  buildProductCardPrompt,
  buildProductFillPrompt,
  resolveAiAgentModel,
} from "@/lib/ai";
import {
  cleanText,
  loadImageForText,
  normalizeSlug,
  parseJsonObject,
  readProductDraft,
} from "@/lib/ai-product-text";

// Wywołanie modelu potrafi myśleć kilkanaście sekund – domyślne 10 s to za mało
export const maxDuration = 60;

/** Ile produktów z kategorii pokazujemy modelowi jako wzór stylu. */
const EXAMPLES = 2;

type Draft = { name: string; slug: string; category: string; description: string };

/**
 * Klocki karty poza opisem właściwym – model odczytuje je ze wzorów, agent
 * pyta o wartości, a układ składa `buildProductDescription` (`lib/product-description.ts`).
 */
type CardExtras = {
  /** Zdanie o temperaturze wypału z wzorów (puste = wzory go nie mają). */
  firingNote: string;
  /** Etykiety wymiarów z wzorów z przykładową wartością (podpowiedź, nie fakt). */
  dimensions: { label: string; example: string }[];
  capacity: { present: boolean; example: string };
  /** Sugerowana cena – mediana cen produktów wzorcowych; 0 = brak. */
  suggestedPrice: number;
};

function readExtras(parsed: Record<string, unknown>): Omit<CardExtras, "suggestedPrice"> {
  const dims = Array.isArray(parsed.dimensions) ? parsed.dimensions : [];
  const cap = parsed.capacity && typeof parsed.capacity === "object" ? (parsed.capacity as Record<string, unknown>) : {};
  return {
    firingNote: cleanText(parsed.firingNote, 300),
    dimensions: dims
      .map((d) => {
        const o = d && typeof d === "object" ? (d as Record<string, unknown>) : {};
        return { label: cleanText(o.label, 40), example: cleanText(o.example, 40) };
      })
      .filter((d) => d.label)
      .slice(0, 6),
    capacity: { present: cap.present === true, example: cleanText(cap.example, 40) },
  };
}

function median(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value);
}

/**
 * Karta produktu ze zdjęcia dla **agenta dodawania produktów** (ADMIN).
 *
 * Dwa tryby, bo agent najpierw pyta właściciela o kategorię, a dopiero potem
 * pisze kartę:
 * - `{ url }` – **krok 1**: to samo rozpoznanie co `/api/admin/ai-text` (co jest
 *   na zdjęciu, która kategoria pasuje, wstępna nazwa i opis). Zwraca
 *   `draft` do odesłania w kroku 2 i `categoryMatched`; przy braku dopasowania
 *   proponuje pierwszą kategorię sklepu (kategoria jest w produkcie obowiązkowa).
 * - `{ url, category, draft }` – **krok 2**: z podanej (potwierdzonej)
 *   kategorii losujemy dwa aktywne produkty (nazwa + opis, z ostatnich 40)
 *   i prosimy model o ostateczną nazwę i opis **w ich stylu i formatowaniu**.
 *   Bez produktów w kategorii zostaje `draft` (bez drugiego wywołania);
 *   bez `draft` krok 1 jest wykonywany od nowa.
 *
 * Model: `ai_agent_model` z Ustawień → AI (puste = model tekstowy). Zwraca
 * `{ name, slug, category, categoryLabel, categoryMatched, description, draft, examples, extras, model, costUsd }` –
 * `description` to najwyżej dwa zdania o przedmiocie, a `extras` (`firingNote`,
 * `dimensions`, `capacity`, `suggestedPrice`) to klocki odczytane ze wzorów,
 * z których agent po pytaniach składa pełny opis (`buildProductDescription`).
 * Zdjęć i zapisu ta trasa nie dotyka – robi to `ProductAgent` po kolei
 * istniejącymi trasami.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isRateLimited(`ai-product-card:${getClientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Za dużo wywołań pod rząd – odczekaj chwilę." }, { status: 429 });
  }

  if (!hasGoogleAiKey()) {
    return NextResponse.json(
      { error: "Brak klucza GOOGLE_AI_API_KEY – uzupełnij go w konfiguracji." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "Brak zdjęcia produktu." }, { status: 400 });
  // Krok 2: kategoria potwierdzona przez właściciela + wstępne rozpoznanie z kroku 1
  const requestedCategory = typeof body?.category === "string" ? body.category.trim().toLowerCase() : "";
  const givenDraft =
    body?.draft && typeof body.draft === "object"
      ? {
          name: cleanText(body.draft.name, AI_TEXT_LIMITS.name),
          description: cleanText(body.draft.description, AI_TEXT_LIMITS.description),
        }
      : null;

  let input: Buffer;
  try {
    const loaded = await loadImageForText(url, new URL(req.url).origin);
    if (!loaded) return NextResponse.json({ error: "Nieobsługiwane źródło zdjęcia." }, { status: 400 });
    input = loaded;
  } catch (e) {
    console.error("[admin/ai-product-card] przygotowanie źródła:", e);
    return NextResponse.json({ error: "Nie udało się pobrać zdjęcia." }, { status: 400 });
  }

  const [settings, categories] = await Promise.all([
    getSettings([AI_AGENT_MODEL_SETTING_KEY, AI_TEXT_MODEL_SETTING_KEY]),
    getCategories(),
  ]);
  // Model rozumowania agenta z Ustawień → AI; bez niego – model tekstowy
  const model = resolveAiAgentModel(settings[AI_AGENT_MODEL_SETTING_KEY], settings[AI_TEXT_MODEL_SETTING_KEY]);
  const image = { data: input, mimeType: "image/jpeg" };
  // Koszt wywołań (USD) – agent sumuje go i pokazuje na końcu przebiegu
  let costUsd = 0;

  // ── Krok 1: rozpoznanie i kategoria (pomijany, gdy agent odesłał gotowy draft) ──
  let draft: Draft;
  if (givenDraft?.name) {
    draft = { ...givenDraft, slug: normalizeSlug(givenDraft.name), category: requestedCategory };
  } else {
    try {
      const result = await generateProductText({ model, prompt: buildProductFillPrompt(categories), image });
      await recordAiUsage({ kind: "text", variant: agentVariant(AI_TEXT_VARIANT), model, ...result.usage });
      costUsd += aiCostUsd(model, result.usage.promptTokens, result.usage.outputTokens);
      const parsed = parseJsonObject(result.text);
      if (!parsed) throw new Error("odpowiedź nie jest JSON-em: " + result.text.slice(0, 200));
      draft = readProductDraft(parsed, categories);
    } catch (e) {
      console.error("[admin/ai-product-card] krok 1:", e);
      return NextResponse.json(
        { error: "Nie udało się rozpoznać produktu na zdjęciu. Spróbuj ponownie lub zmień model." },
        { status: 502 }
      );
    }
  }

  // Tryb „tylko kategoria”: bez potwierdzonej kategorii oddajemy sam draft –
  // właściciel najpierw potwierdza albo zmienia kategorię, dopiero potem
  // piszemy kartę w jej stylu (drugie wywołanie idzie już po potwierdzeniu)
  if (!requestedCategory) {
    const matched = categories.find((c) => c.slug === draft.category) ?? null;
    const fallback = matched ?? categories[0] ?? null;
    return NextResponse.json({
      ...draft,
      category: fallback?.slug ?? "",
      categoryLabel: fallback?.label ?? "",
      categoryMatched: Boolean(matched),
      draft: { name: draft.name, description: draft.description },
      examples: [],
      model,
      costUsd,
    });
  }

  // ── Krok 2: styl z produktów potwierdzonej kategorii ──
  const category = categories.find((c) => c.slug === requestedCategory);
  if (!category) return NextResponse.json({ error: "Nieznana kategoria." }, { status: 400 });

  let examples: { name: string; description: string; price: number }[] = [];
  try {
    const rows = await withDbRetry(() =>
      db.product.findMany({
        where: { category: category.slug, active: true },
        select: { name: true, description: true, price: true },
        take: 40,
        orderBy: { createdAt: "desc" },
      })
    );
    // Dwa losowe z ostatnich czterdziestu – wzór stylu, nie ranking
    examples = rows
      .map((r) => ({ name: r.name, description: r.description ?? "", price: r.price, key: Math.random() }))
      .sort((a, b) => a.key - b.key)
      .slice(0, EXAMPLES)
      .map(({ name, description, price }) => ({ name, description, price }));
  } catch (e) {
    console.error("[admin/ai-product-card] odczyt przykładów:", e);
  }

  let final: Draft = { ...draft, category: category.slug };
  let extras: CardExtras = {
    firingNote: "",
    dimensions: [],
    capacity: { present: false, example: "" },
    suggestedPrice: median(examples.map((e) => e.price)),
  };
  if (examples.length > 0) {
    try {
      const result = await generateProductText({
        model,
        prompt: buildProductCardPrompt(category, draft, examples),
        image,
      });
      await recordAiUsage({ kind: "text", variant: agentVariant(AI_CARD_VARIANT), model, ...result.usage });
      costUsd += aiCostUsd(model, result.usage.promptTokens, result.usage.outputTokens);
      const parsed = parseJsonObject(result.text);
      if (parsed) {
        const name = cleanText(parsed.name, AI_TEXT_LIMITS.name) || draft.name;
        final = {
          name,
          slug: normalizeSlug(cleanText(parsed.slug, AI_TEXT_LIMITS.slug)) || normalizeSlug(name),
          category: category.slug,
          description: cleanText(parsed.description, AI_TEXT_LIMITS.description) || draft.description,
        };
        extras = { ...extras, ...readExtras(parsed) };
      }
    } catch (e) {
      // Wynik kroku 1 jest już użyteczny – nie przerywamy przez błąd stylizacji
      console.error("[admin/ai-product-card] krok 2:", e);
    }
  }

  if (!final.name) {
    return NextResponse.json({ error: "Model nie podał nazwy produktu – spróbuj ponownie." }, { status: 502 });
  }

  return NextResponse.json({
    ...final,
    categoryLabel: category.label,
    categoryMatched: true,
    draft: { name: final.name, description: final.description },
    examples: examples.map((e) => e.name),
    extras,
    model,
    costUsd,
  });
}
