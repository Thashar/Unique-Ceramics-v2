import sharp from "sharp";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSetting } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { resolveOwnImageSource, fetchOwnImage } from "@/lib/image-source";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_TEXT_LIMITS,
  AI_TEXT_MODEL_SETTING_KEY,
  AI_TEXT_VARIANT,
  buildProductFillPrompt,
  resolveAiTextModel,
} from "@/lib/ai";

// Model potrafi myśleć kilkanaście sekund – domyślne 10 s bywa za mało.
export const maxDuration = 60;

/** Do opisu wystarczy mniejsze zdjęcie niż do generowania grafiki. */
const INPUT_MAX_WIDTH = 1024;

/** Ten sam format sluga co w walidacji produktu (`[a-z0-9-]`). */
function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, AI_TEXT_LIMITS.slug);
}

/** Model bywa rozmowny – wyciągamy sam obiekt JSON z odpowiedzi. */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const withoutFences = text.replace(/```(?:json)?/gi, "").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(withoutFences.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

const str = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";

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

  const source = resolveOwnImageSource(url, new URL(req.url).origin);
  if (!source) {
    return NextResponse.json({ error: "Nieobsługiwane źródło zdjęcia." }, { status: 400 });
  }

  let input: Buffer;
  try {
    const original = await fetchOwnImage(source);
    input = await sharp(original)
      .resize({ width: INPUT_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
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

  const name = str(parsed.name, AI_TEXT_LIMITS.name);
  const slugFromModel = normalizeSlug(str(parsed.slug, AI_TEXT_LIMITS.slug));
  // Kategoria musi istnieć w sklepie – wymyśloną odrzucamy i zostawiamy wybór adminowi
  const categorySlug = str(parsed.category, 100).toLowerCase();
  const category = categories.some((c) => c.slug === categorySlug) ? categorySlug : "";

  return NextResponse.json({
    name,
    slug: slugFromModel || normalizeSlug(name),
    category,
    description: str(parsed.description, AI_TEXT_LIMITS.description),
    model,
  });
}
