import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_AGENT_MODEL_SETTING_KEY,
  AI_CHAT_LIMITS,
  AI_CHAT_VARIANT,
  AI_TEXT_MODEL_SETTING_KEY,
  agentVariant,
  aiCostUsd,
  buildAgentChatPrompt,
  resolveAiAgentModel,
} from "@/lib/ai";
import { cleanText, parseJsonObject } from "@/lib/ai-product-text";

// Model bywa rozmowny i myśli kilka sekund – domyślne 10 s bywa za mało
export const maxDuration = 60;

/** Ile przycisków opisujemy modelowi (więcej i tak nie ma żadne pytanie agenta). */
const MAX_OPTIONS = 30;

/**
 * **Swobodna wiadomość do agenta dodawania produktów** (ADMIN). Właściciel może
 * napisać własnymi słowami przy każdym pytaniu – zamiast klikać przycisk albo
 * wpisywać samą liczbę.
 *
 * `{ message, question, options, input, state }` → `{ reply, choice, value, correction, costUsd }`.
 *
 * **Model nie steruje przebiegiem.** Może wskazać jeden z przycisków, które
 * agent właśnie pokazuje (`choice`), podać wartość do bieżącego pola (`value`)
 * albo tylko odpowiedzieć zdaniem (`reply`). Czy wybór istnieje i czy wartość
 * pasuje do pytania, rozstrzyga `ProductAgent` po stronie klienta – nietrafiona
 * odpowiedź modelu kończy się więc zdaniem w rozmowie, a nie ruchem
 * w przebiegu. Model z `ai_agent_model` (puste = tekstowy), rate limit 60/10 min.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isRateLimited(`ai-agent-chat:${getClientIp(req)}`, 60, 10 * 60_000)) {
    return NextResponse.json({ error: "Za dużo wiadomości pod rząd – odczekaj chwilę." }, { status: 429 });
  }

  if (!hasGoogleAiKey()) {
    return NextResponse.json(
      { error: "Brak klucza GOOGLE_AI_API_KEY – uzupełnij go w konfiguracji." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const message = cleanText(body?.message, AI_CHAT_LIMITS.message);
  if (!message) return NextResponse.json({ error: "Pusta wiadomość." }, { status: 400 });

  const rawOptions = Array.isArray(body?.options) ? body.options.slice(0, MAX_OPTIONS) : [];
  const options = rawOptions
    .map((o: unknown) => {
      const row = o && typeof o === "object" ? (o as Record<string, unknown>) : {};
      return { value: cleanText(row.value, 80), label: cleanText(row.label, 120) };
    })
    .filter((o: { label: string }) => o.label);
  const input = body?.input === "number" || body?.input === "text" ? body.input : "none";

  const settings = await getSettings([AI_AGENT_MODEL_SETTING_KEY, AI_TEXT_MODEL_SETTING_KEY]);
  const model = resolveAiAgentModel(settings[AI_AGENT_MODEL_SETTING_KEY], settings[AI_TEXT_MODEL_SETTING_KEY]);

  try {
    const prompt = buildAgentChatPrompt(
      {
        question: cleanText(body?.question, 500),
        options,
        input,
        state: cleanText(body?.state, 1000),
      },
      message
    );
    const result = await generateProductText({ model, prompt });
    await recordAiUsage({ kind: "text", variant: agentVariant(AI_CHAT_VARIANT), model, ...result.usage });
    const costUsd = aiCostUsd(model, result.usage.promptTokens, result.usage.outputTokens);

    const parsed = parseJsonObject(result.text);
    const reply = cleanText(parsed?.reply, AI_CHAT_LIMITS.reply);
    const choice = cleanText(parsed?.choice, 80);
    // Poprawka faktu („to czarka, nie miska”) – agent trzyma ją do końca
    // przebiegu i podaje kolejnym krokom jako wiążącą
    const correction = cleanText(parsed?.correction, AI_CHAT_LIMITS.value);
    return NextResponse.json({
      // Model bywa oszczędny w JSON-ie – bez „reply” zostaje sam surowy tekst
      reply: reply || cleanText(result.text, AI_CHAT_LIMITS.reply),
      // Wybór przyjmujemy tylko wtedy, gdy taki przycisk naprawdę istnieje
      // Poprawka faktu unieważnia wybór przycisku: o kolejnym kroku decyduje
      // właściciel, a model ma tylko zapisać, co powiedział (19.09.2026)
      choice: correction || !options.some((o: { value: string }) => o.value === choice) ? "" : choice,
      value: cleanText(parsed?.value, AI_CHAT_LIMITS.value),
      correction,
      model,
      costUsd,
    });
  } catch (e) {
    console.error("[admin/ai-agent-chat]", e);
    return NextResponse.json({ error: "Nie udało się odpowiedzieć – spróbuj jeszcze raz." }, { status: 502 });
  }
}
