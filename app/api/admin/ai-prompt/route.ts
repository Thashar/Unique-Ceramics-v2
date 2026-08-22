import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSetting } from "@/lib/settings";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_PRESET_LIMITS,
  AI_PROMPT_VARIANT,
  AI_TEXT_MODEL_SETTING_KEY,
  buildScenePrompt,
  resolveAiTextModel,
} from "@/lib/ai";

// Model bywa rozgadany i myśli kilkanaście sekund – domyślne 10 s to za mało.
export const maxDuration = 60;

/**
 * Układa opis sceny (preset promptu) na podstawie polecenia po polsku.
 * Sam prompt wysyłany później do modelu obrazowego powstaje z tej sceny
 * i niezmiennych reguł produktu (`buildImagePrompt`) – ta trasa ich nie dotyka.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Każde wywołanie kosztuje – ten sam wzorzec limitu co przy pozostałych trasach AI
  if (await isRateLimited(`ai-prompt:${getClientIp(req)}`, 30, 10 * 60_000)) {
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
  const description =
    typeof body?.description === "string"
      ? body.description.trim().slice(0, AI_PRESET_LIMITS.description)
      : "";
  if (description.length < 3) {
    return NextResponse.json(
      { error: "Opisz krótko, jak ma wyglądać scena na zdjęciu." },
      { status: 400 }
    );
  }

  const model = resolveAiTextModel(await getSetting(AI_TEXT_MODEL_SETTING_KEY));

  try {
    const result = await generateProductText({ model, prompt: buildScenePrompt(description) });
    await recordAiUsage({
      kind: "text",
      variant: AI_PROMPT_VARIANT,
      model,
      ...result.usage,
    });

    // Model lubi opakować odpowiedź w blok kodu albo cudzysłowy – zdejmujemy je,
    // bo tekst trafia wprost do promptu wysyłanego do modelu obrazowego
    const scene = result.text
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```/g, "")
      .trim()
      .replace(/^["'`]|["'`]$/g, "")
      .trim()
      .slice(0, AI_PRESET_LIMITS.scene);

    if (!scene) {
      return NextResponse.json(
        { error: "Model nie zwrócił promptu – spróbuj opisać scenę inaczej." },
        { status: 502 }
      );
    }

    return NextResponse.json({ scene, model });
  } catch (e) {
    console.error("[admin/ai-prompt] generowanie:", e);
    return NextResponse.json(
      { error: "Nie udało się przygotować promptu. Spróbuj ponownie." },
      { status: 502 }
    );
  }
}
