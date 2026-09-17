import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, withDbRetry } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_CARD_VARIANT,
  AI_TEXT_LIMITS,
  AI_TEXT_MODEL_SETTING_KEY,
  AI_TEXT_VARIANT,
  aiCostUsd,
  buildProductCardPrompt,
  buildProductFillPrompt,
  resolveAiTextModel,
} from "@/lib/ai";
import {
  cleanText,
  loadImageForText,
  normalizeSlug,
  parseJsonObject,
  readProductDraft,
} from "@/lib/ai-product-text";

// Dwa wywołania modelu pod rząd – każde potrafi myśleć kilkanaście sekund
export const maxDuration = 60;

/** Ile produktów z kategorii pokazujemy modelowi jako wzór stylu. */
const EXAMPLES = 2;

/**
 * Karta produktu ze zdjęcia dla **szybkiego dodawania** (ADMIN; `{ url }`).
 *
 * Krok 1 – to samo rozpoznanie co `/api/admin/ai-text`: co jest na zdjęciu,
 * która kategoria sklepu pasuje, wstępna nazwa i opis.
 * Krok 2 – z tej kategorii losujemy dwa istniejące produkty (nazwa + opis)
 * i prosimy model o ostateczną nazwę i opis **w ich stylu**. Bez kategorii
 * albo bez produktów w niej zostaje wynik kroku 1.
 *
 * Zwraca `{ name, slug, category, categoryLabel, description, examples, model }` –
 * `examples` to nazwy produktów, na których model się wzorował (panel
 * pokazuje je w dzienniku). Zdjęć i zapisu ta trasa nie dotyka: robi to
 * `QuickAddProduct` po kolei istniejącymi trasami.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isRateLimited(`ai-product-card:${getClientIp(req)}`, 20, 10 * 60_000)) {
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

  let input: Buffer;
  try {
    const loaded = await loadImageForText(url, new URL(req.url).origin);
    if (!loaded) return NextResponse.json({ error: "Nieobsługiwane źródło zdjęcia." }, { status: 400 });
    input = loaded;
  } catch (e) {
    console.error("[admin/ai-product-card] przygotowanie źródła:", e);
    return NextResponse.json({ error: "Nie udało się pobrać zdjęcia." }, { status: 400 });
  }

  const [modelSetting, categories] = await Promise.all([
    getSetting(AI_TEXT_MODEL_SETTING_KEY),
    getCategories(),
  ]);
  const model = resolveAiTextModel(modelSetting);
  const image = { data: input, mimeType: "image/jpeg" };
  // Koszt obu wywołań (USD) – panel pokazuje sumę na końcu szybkiego dodawania
  let costUsd = 0;

  // ── Krok 1: rozpoznanie i kategoria ──
  let draft;
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

  // ── Krok 2: styl z produktów tej samej kategorii ──
  const category = categories.find((c) => c.slug === draft.category);
  let examples: { name: string; description: string }[] = [];
  if (category) {
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
  }

  let final = draft;
  if (category && examples.length > 0) {
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
      }
    } catch (e) {
      // Wynik kroku 1 jest już użyteczny – nie przerywamy przez błąd stylizacji
      console.error("[admin/ai-product-card] krok 2:", e);
    }
  }

  if (!final.name) {
    return NextResponse.json({ error: "Model nie podał nazwy produktu – spróbuj ponownie." }, { status: 502 });
  }

  // Kategoria jest w produkcie obowiązkowa – gdy model żadnej nie dopasował,
  // bierzemy pierwszą ze sklepu i mówimy o tym panelowi (`categoryMatched`),
  // żeby właściciel poprawił ją w formularzu
  const fallback = category ?? categories[0] ?? null;

  return NextResponse.json({
    ...final,
    category: fallback?.slug ?? "",
    categoryLabel: fallback?.label ?? "",
    categoryMatched: Boolean(category),
    examples: examples.map((e) => e.name),
    model,
    costUsd,
  });
}
