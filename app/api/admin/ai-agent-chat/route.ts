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
  AI_TEXT_LIMITS,
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
 * `{ message, question, options, input, state, steps }` → `{ reply, choice, value, correction, name, goto, costUsd }`.
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
  // Kroki, do których agent umie wrócić – lista przychodzi z przebiegu,
  // więc model nie może wskazać czegoś, czego `ProductAgent` nie obsługuje
  const rawSteps = Array.isArray(body?.steps) ? body.steps.slice(0, MAX_OPTIONS) : [];
  const steps = rawSteps
    .map((s: unknown) => {
      const row = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
      return { id: cleanText(row.id, 40), label: cleanText(row.label, 80) };
    })
    .filter((s: { id: string }) => s.id);

  const settings = await getSettings([AI_AGENT_MODEL_SETTING_KEY, AI_TEXT_MODEL_SETTING_KEY]);
  const model = resolveAiAgentModel(settings[AI_AGENT_MODEL_SETTING_KEY], settings[AI_TEXT_MODEL_SETTING_KEY]);

  try {
    const prompt = buildAgentChatPrompt(
      {
        question: cleanText(body?.question, 500),
        options,
        input,
        state: cleanText(body?.state, 1000),
        steps,
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
    // **Gotowa nazwa podyktowana przez właściciela** – wchodzi do karty taka,
    // jaka jest. Większość takich wiadomości rozpoznaje `dictatedName` jeszcze
    // w przeglądarce (bez modelu, więc bez ryzyka przekręcenia); tu wpada to,
    // czego wzorzec nie złapał. Nazwa unieważnia `correction`: rodzaj przedmiotu
    // nie jest już potrzebny, skoro nazwa jest ustalona (19.09.2026)
    const name = cleanText(parsed?.name, AI_TEXT_LIMITS.name);
    // Powrót do wcześniejszego kroku – tylko taki, który przebieg wystawił
    const wanted = cleanText(parsed?.goto, 40);
    const goto = steps.some((s: { id: string }) => s.id === wanted) ? wanted : "";
    return NextResponse.json({
      // Model bywa oszczędny w JSON-ie – bez „reply” zostaje sam surowy tekst
      reply: reply || cleanText(result.text, AI_CHAT_LIMITS.reply),
      // Wybór przyjmujemy tylko wtedy, gdy taki przycisk naprawdę istnieje
      // Poprawka faktu unieważnia wybór przycisku: o kolejnym kroku decyduje
      // właściciel, a model ma tylko zapisać, co powiedział (19.09.2026)
      // Poprawka faktu i prośba o powrót unieważniają wybór przycisku:
      // o kolejnym kroku decyduje właściciel, model tylko zapisuje, co powiedział
      choice: name || correction || goto || !options.some((o: { value: string }) => o.value === choice) ? "" : choice,
      value: name || goto ? "" : cleanText(parsed?.value, AI_CHAT_LIMITS.value),
      correction: name ? "" : correction,
      name,
      // Nazwę stosujemy od ręki, więc powrót do kroku „nazwa” byłby pusty
      goto: name ? "" : goto,
      model,
      costUsd,
    });
  } catch (e) {
    console.error("[admin/ai-agent-chat]", e);
    return NextResponse.json({ error: "Nie udało się odpowiedzieć – spróbuj jeszcze raz." }, { status: 502 });
  }
}
