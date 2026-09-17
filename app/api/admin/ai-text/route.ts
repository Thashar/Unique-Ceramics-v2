import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSetting } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { loadImageForText, parseJsonObject, readProductDraft } from "@/lib/ai-product-text";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_TEXT_MODEL_SETTING_KEY,
  AI_TEXT_VARIANT,
  buildProductFillPrompt,
  resolveAiTextModel,
} from "@/lib/ai";

// Model potrafi myśleć kilkanaście sekund – domyślne 10 s bywa za mało.
export const maxDuration = 60;

// Przygotowanie zdjęcia, odczyt JSON-a i normalizacja pól są wspólne
// z `/api/admin/ai-product-card` – patrz `lib/ai-product-text.ts`
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Każde żądanie to płatne wywołanie modelu
  if (await isRateLimited(`ai-text:${getClientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Za dużo wywołań pod rząd – odczekaj chwilę." },
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
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Brak zdjęcia do opisania." }, { status: 400 });
  }

  let input: Buffer;
  try {
    const loaded = await loadImageForText(url, new URL(req.url).origin);
    if (!loaded) {
      return NextResponse.json({ error: "Nieobsługiwane źródło zdjęcia." }, { status: 400 });
    }
    input = loaded;
  } catch (e) {
    console.error("[admin/ai-text] przygotowanie źródła:", e);
    return NextResponse.json(
      { error: "Nie udało się pobrać zdjęcia do opisania." },
      { status: 400 }
    );
  }

  const [modelSetting, categories] = await Promise.all([
    getSetting(AI_TEXT_MODEL_SETTING_KEY),
    getCategories(),
  ]);
  const model = resolveAiTextModel(modelSetting);

  let text: string;
  try {
    const result = await generateProductText({
      model,
      prompt: buildProductFillPrompt(categories),
      image: { data: input, mimeType: "image/jpeg" },
    });
    text = result.text;
    // Zapis od razu po udanym wywołaniu – od tej chwili jest płatne,
    // niezależnie od tego, czy odpowiedź da się sparsować
    await recordAiUsage({
      kind: "text",
      variant: AI_TEXT_VARIANT,
      model,
      ...result.usage,
    });
  } catch (e) {
    console.error("[admin/ai-text] generowanie:", e);
    return NextResponse.json(
      { error: "Nie udało się uzupełnić danych. Spróbuj ponownie lub zmień model." },
      { status: 502 }
    );
  }

  const parsed = parseJsonObject(text);
  if (!parsed) {
    console.error("[admin/ai-text] odpowiedź nie jest JSON-em:", text.slice(0, 300));
    return NextResponse.json(
      { error: "Model odpowiedział w nieoczekiwanym formacie – spróbuj ponownie." },
      { status: 502 }
    );
  }

  // Kategoria musi istnieć w sklepie – wymyśloną odrzuca `readProductDraft`
  return NextResponse.json({ ...readProductDraft(parsed, categories), model });
}
