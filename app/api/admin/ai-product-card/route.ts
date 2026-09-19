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

/** Ile nazw produktów trafia do słownika sklepu i ile z nich na kategorię. */
const VOCABULARY_POOL = 120;
const VOCABULARY_PER_CATEGORY = 6;

/**
 * **Słownik sklepu** dla kroku 1: nazwy już wystawionych produktów w rozbiciu
 * na kategorie. Bez niego model nazywał przedmioty słowami ze swojego treningu
 * („miska”) tam, gdzie sklep ma własne, węższe nazwy („czarka”). Odczyt jest
 * w `try/catch` – brak słownika tylko pogarsza rozpoznanie, nie psuje przebiegu.
 */
async function readVocabulary(categories: { slug: string; label: string }[]) {
  try {
    const rows = await withDbRetry(() =>
      db.product.findMany({
        where: { active: true },
        select: { name: true, category: true },
        take: VOCABULARY_POOL,
        orderBy: { createdAt: "desc" },
      })
    );
    return categories
      .map((c) => ({
        label: c.label,
        names: rows.filter((r) => r.category === c.slug).slice(0, VOCABULARY_PER_CATEGORY).map((r) => r.name),
      }))
      .filter((v) => v.names.length > 0);
  } catch (e) {
    console.error("[admin/ai-product-card] słownik sklepu:", e);
    return [];
  }
}

type Draft = { name: string; slug: string; category: string; description: string };

/**
 * Klocki karty poza opisem właściwym. Został **sam** przepisany ze wzorów
 * zwrot o wypale – to kwestia stylu, a nie fakt o przedmiocie.
 *
 * ⚠️ **Wymiary, pojemność i cena wyszły stąd 19.09.2026.** Etykiety wymiarów
 * model czytał z dwóch losowych produktów, więc przy każdym produkcie pytał
 * o co innego; cena była **medianą ich cen** i przy 76 zł i 100 zł wychodziło
 * 88 zł – kwota, której nie miał żaden produkt w sklepie. Dziś o wymiary pyta
 * kategoria (`category_dims_{id}`), a ceny podaje `/api/admin/product-hints`
 * z prawdziwych, podobnie nazwanych produktów. **Nie wracaj tu do zgadywania.**
 */
type CardExtras = {
  /** Zdanie o temperaturze wypału z wzorów (puste = wzory go nie mają). */
  firingNote: string;
};

function readExtras(parsed: Record<string, unknown>): CardExtras {
  return { firingNote: cleanText(parsed.firingNote, 300) };
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
 * `description` to najwyżej dwa zdania o przedmiocie, a `extras.firingNote`
 * to zwrot o wypale przepisany ze wzorów; pełny opis składa agent
 * (`buildProductDescription`) z wymiarów, o które pyta wg ustawień kategorii.
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
  // Poprawka właściciela z rozmowy („to nie miska, tylko czarka”) – nadrzędna
  // nad rozpoznaniem ze zdjęcia i nad wzorami z kategorii
  const correction = cleanText(body?.correction, AI_TEXT_LIMITS.description);
  // Nazwa ustalona już z właścicielem: model jej nie zmienia, agent ją narzuca
  const lockName = body?.lockName === true;
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
      const result = await generateProductText({
        model,
        prompt: buildProductFillPrompt(categories, await readVocabulary(categories)),
        image,
      });
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
  let extras: CardExtras = { firingNote: "" };
  if (examples.length > 0) {
    try {
      const result = await generateProductText({
        model,
        prompt: buildProductCardPrompt(category, draft, examples, correction, lockName ? draft.name : ""),
        image,
      });
      await recordAiUsage({ kind: "text", variant: agentVariant(AI_CARD_VARIANT), model, ...result.usage });
      costUsd += aiCostUsd(model, result.usage.promptTokens, result.usage.outputTokens);
      const parsed = parseJsonObject(result.text);
      if (parsed) {
        // Nazwa uzgodniona z właścicielem jest nietykalna – model dostaje ją
        // w prompcie, ale gdyby mimo to napisał swoją, i tak nie wejdzie
        const name = lockName
          ? draft.name
          : cleanText(parsed.name, AI_TEXT_LIMITS.name) || draft.name;
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
