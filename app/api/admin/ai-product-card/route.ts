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
  AI_DIMENSIONS_PLACEHOLDER,
  AI_TEXT_LIMITS,
  AI_TEXT_MODEL_SETTING_KEY,
  AI_TEXT_VARIANT,
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

/** Zapis wymiarów (`{WYMIARY}` w opisie) i wzór formatu z przykładów – dopełnia je agent. */
type Dimensions = { placeholder: boolean; format: string };

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
 * `{ name, slug, category, categoryLabel, categoryMatched, description, draft, examples, dimensions, model, costUsd }` –
 * `dimensions.placeholder` = opis zawiera `{WYMIARY}` (produkty z kategorii podają
 * wymiary, model ich nie zna), `dimensions.format` = wzór zapisu z przykładów.
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
      await recordAiUsage({ kind: "text", variant: AI_TEXT_VARIANT, model, ...result.usage });
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

  let examples: { name: string; description: string }[] = [];
  try {
    const rows = await withDbRetry(() =>
      db.product.findMany({
        where: { category: category.slug, active: true },
        select: { name: true, description: true },
        take: 40,
        orderBy: { createdAt: "desc" },
      })
    );
    // Dwa losowe z ostatnich czterdziestu – wzór stylu, nie ranking
    examples = rows
      .map((r) => ({ name: r.name, description: r.description ?? "", key: Math.random() }))
      .sort((a, b) => a.key - b.key)
      .slice(0, EXAMPLES)
      .map(({ name, description }) => ({ name, description }));
  } catch (e) {
    console.error("[admin/ai-product-card] odczyt przykładów:", e);
  }

  let final: Draft = { ...draft, category: category.slug };
  let dimensions: Dimensions = { placeholder: false, format: "" };
  if (examples.length > 0) {
    try {
      const result = await generateProductText({
        model,
        prompt: buildProductCardPrompt(category, draft, examples),
        image,
      });
      await recordAiUsage({ kind: "text", variant: AI_CARD_VARIANT, model, ...result.usage });
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
        dimensions = {
          placeholder: final.description.includes(AI_DIMENSIONS_PLACEHOLDER),
          format: cleanText(parsed.dimensionsFormat, 120),
        };
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
    dimensions,
    model,
    costUsd,
  });
}
