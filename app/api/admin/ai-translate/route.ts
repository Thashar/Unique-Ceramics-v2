import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSetting } from "@/lib/settings";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_TEXT_MODEL_SETTING_KEY,
  AI_TRANSLATE_LIMITS,
  AI_TRANSLATE_VARIANT,
  aiCostUsd,
  buildTranslatePrompt,
  resolveAiTextModel,
} from "@/lib/ai";

// Dłuższe sekcje (regulamin warsztatów, FAQ) potrafią zająć modelowi kilkanaście sekund
export const maxDuration = 60;

/**
 * Tłumaczy listę polskich tekstów na angielski (ADMIN; `{ texts: string[] }`
 * → `{ texts: string[], model }`). Obsługuje przyciski „Przetłumacz przez AI”
 * w panelu – przy produkcie, projekcie, kategoriach i sekcjach ustawień.
 * Struktury JSON (oferty warsztatów, FAQ, karty) panel rozkłada na listę
 * napisów przed wysłaniem (`collectStrings`) i składa z powrotem po odpowiedzi
 * (`replaceStrings`), więc trasa zna tylko płaską tablicę.
 *
 * Odpowiedź modelu musi mieć **tyle samo pozycji** co żądanie – inaczej
 * tłumaczenia trafiłyby do złych pól; wtedy zwracamy 502 zamiast zgadywać.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Każde wywołanie kosztuje – ten sam wzorzec limitu co przy pozostałych trasach AI
  if (await isRateLimited(`ai-translate:${getClientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Za dużo prób pod rząd – odczekaj chwilę." },
      { status: 429 }
    );
  }

  if (!hasGoogleAiKey()) {
    return NextResponse.json(
      { error: "Brak klucza GOOGLE_AI_API_KEY – uzupełnij go w konfiguracji." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const texts: unknown = body?.texts;
  if (!Array.isArray(texts) || texts.some((t) => typeof t !== "string")) {
    return NextResponse.json({ error: "Nieprawidłowe dane – oczekiwano listy tekstów." }, { status: 400 });
  }
  if (texts.length === 0) return NextResponse.json({ texts: [], model: null });
  if (texts.length > AI_TRANSLATE_LIMITS.items) {
    return NextResponse.json(
      { error: `Za dużo fragmentów naraz (maks. ${AI_TRANSLATE_LIMITS.items}).` },
      { status: 400 }
    );
  }
  const total = texts.reduce((sum: number, t: string) => sum + t.length, 0);
  if (total > AI_TRANSLATE_LIMITS.chars) {
    return NextResponse.json(
      { error: `Tekst jest za długi (maks. ${AI_TRANSLATE_LIMITS.chars} znaków naraz).` },
      { status: 400 }
    );
  }

  const model = resolveAiTextModel(await getSetting(AI_TEXT_MODEL_SETTING_KEY));

  try {
    const result = await generateProductText({ model, prompt: buildTranslatePrompt(texts) });
    await recordAiUsage({
      kind: "text",
      variant: AI_TRANSLATE_VARIANT,
      model,
      ...result.usage,
    });

    const translated = parseArray(result.text);
    if (!translated || translated.length !== texts.length) {
      console.error("[admin/ai-translate] zła liczba pozycji:", translated?.length, "oczekiwano", texts.length);
      return NextResponse.json(
        { error: "Model zwrócił niepełne tłumaczenie – spróbuj ponownie." },
        { status: 502 }
      );
    }

    // Długi myślnik łamie typografię sklepu – prompt o to prosi, ale model bywa głuchy
    return NextResponse.json({
      texts: translated.map((t) => t.replace(/[—―]/g, "–")),
      model,
      costUsd: aiCostUsd(model, result.usage.promptTokens, result.usage.outputTokens),
    });
  } catch (e) {
    console.error("[admin/ai-translate] tłumaczenie:", e);
    return NextResponse.json(
      { error: "Nie udało się przetłumaczyć tekstu. Spróbuj ponownie." },
      { status: 502 }
    );
  }
}

/** Tablica stringów z odpowiedzi modelu – znosi bloki ``` i tekst wokół JSON-a. */
function parseArray(raw: string): string[] | null {
  const cleaned = raw.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed) || parsed.some((t) => typeof t !== "string")) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}
