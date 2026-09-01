import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { resolveOwnImageSource, fetchOwnImage } from "@/lib/image-source";
import { generateProductImage, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_IMAGE_SUFFIX,
  AI_MODEL_PRICING,
  AI_MODEL_SETTING_KEY,
  AI_PRESET_SETTING_KEY,
  AI_PRESETS_SETTING_KEY,
  buildImagePrompt,
  isAiVariant,
  parseAiPresets,
  resolveAiModel,
  resolveAiPreset,
} from "@/lib/ai";

// Generowanie obrazu trwa dłużej niż zwykłe żądanie – domyślne 10 s to za mało.
export const maxDuration = 60;

/** Wejście dla modelu: JPEG bywa akceptowany wszędzie, WebP nie zawsze. */
const INPUT_MAX_WIDTH = 1536;

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Każde żądanie to płatne wywołanie modelu – limit chroni przed serią klików
  if (await isRateLimited(`ai-image:${getClientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Za dużo generowań pod rząd – odczekaj chwilę." },
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
  const variant = body?.variant;
  if (!url || !isAiVariant(variant)) {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania." }, { status: 400 });
  }

  const source = resolveOwnImageSource(url, new URL(req.url).origin);
  if (!source) {
    return NextResponse.json({ error: "Nieobsługiwane źródło zdjęcia." }, { status: 400 });
  }

  let input: Buffer;
  try {
    const original = await fetchOwnImage(source);
    // Konwersja na JPEG: zdjęcia w Storage są w WebP, a wejście modelu ma być
    // formatem obsługiwanym na pewno. Zmniejszenie ogranicza też rozmiar base64.
    input = await sharp(original)
      .resize({ width: INPUT_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 95 })
      .toBuffer();
  } catch (e) {
    console.error("[admin/ai-image] przygotowanie źródła:", e);
    return NextResponse.json(
      { error: "Nie udało się pobrać zdjęcia do przetworzenia." },
      { status: 400 }
    );
  }

  const settings = await getSettings([
    AI_MODEL_SETTING_KEY[variant],
    AI_PRESET_SETTING_KEY[variant],
    AI_PRESETS_SETTING_KEY,
  ]);
  const model = resolveAiModel(variant, settings[AI_MODEL_SETTING_KEY[variant]]);
  // Scena z presetu wybranego dla tego przycisku; reguły produktu (kąt ujęcia,
  // kadr, kolor, komplet, skala) dokłada buildImagePrompt – preset nie może ich pominąć
  const preset = resolveAiPreset(
    variant,
    settings[AI_PRESET_SETTING_KEY[variant]],
    parseAiPresets(settings[AI_PRESETS_SETTING_KEY])
  );

  let generated: Buffer;
  try {
    const result = await generateProductImage({
      model,
      prompt: buildImagePrompt(preset.scene),
      image: { data: input, mimeType: "image/jpeg" },
      fallbackOutputTokens: AI_MODEL_PRICING[model]?.tokensPerImage ?? 0,
    });
    // Zużycie zapisujemy od razu po udanym wywołaniu – od tego momentu jest płatne,
    // niezależnie od tego, czy dalsza obróbka i zapis do Storage się powiodą
    await recordAiUsage({ kind: "image", variant, model, ...result.usage });
    // Ten sam format co upload i obrót – WebP, maks. 1920 px, maksymalna jakość
    generated = await sharp(result.image.data)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 100 })
      .toBuffer();
  } catch (e) {
    console.error("[admin/ai-image] generowanie:", e);
    return NextResponse.json(
      { error: "Nie udało się wygenerować zdjęcia. Spróbuj ponownie lub zmień model." },
      { status: 502 }
    );
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Sufiks `-ai.webp` jest znaczący: po nim panel poznaje zdjęcia z AI i nie
  // pozwala puścić ich przez model drugi raz (patrz `isAiGeneratedImage`)
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${AI_IMAGE_SUFFIX}`;

  // Blob, nie Buffer – patrz komentarz w /api/admin/upload
  const blob = new Blob([new Uint8Array(generated)], { type: "image/webp" });

  const { error } = await supabase.storage
    .from("products")
    .upload(filename, blob, { contentType: "image/webp", upsert: false });

  if (error) {
    console.error("[admin/ai-image] supabase upload error:", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać wygenerowanego zdjęcia." },
      { status: 500 }
    );
  }

  const { data: info } = await supabase.storage.from("products").info(filename);
  if (info && typeof info.size === "number" && info.size !== generated.byteLength) {
    console.error(
      `[admin/ai-image] uszkodzony zapis: oczekiwano ${generated.byteLength} B, zapisano ${info.size} B`
    );
    await supabase.storage.from("products").remove([filename]);
    return NextResponse.json(
      { error: "Plik zapisał się uszkodzony – spróbuj ponownie." },
      { status: 500 }
    );
  }

  const { data } = supabase.storage.from("products").getPublicUrl(filename);
  return NextResponse.json({ url: data.publicUrl, model });
}
