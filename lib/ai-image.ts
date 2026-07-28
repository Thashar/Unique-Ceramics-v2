// Generowanie zdjęć produktowych przez Google AI (Gemini) – wspólne definicje
// dla panelu admina (wybór modelu, przyciski AI / AI+) i trasy serwerowej.
// Moduł jest neutralny (same stałe) – może trafić do bundle klienta.

/** Warianty generowania dostępne przy każdym zdjęciu produktu. */
export type AiVariant = "ai" | "ai_plus";

/**
 * Modele Gemini z wyjściem obrazowym. Lista jest allowlistą – wartość z ustawień
 * spoza niej jest ignorowana (do bazy trafia zwykły string, a nazwa modelu idzie
 * prosto do URL-a API).
 */
export const AI_IMAGE_MODELS = [
  { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image (szybki)" },
  { id: "gemini-3.1-flash-lite-image", label: "Gemini 3.1 Flash Lite Image (najtańszy)" },
  { id: "gemini-3-pro-image", label: "Gemini 3 Pro Image (najlepsza jakość)" },
  { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (starszy)" },
] as const;

export const AI_MODEL_IDS: string[] = AI_IMAGE_MODELS.map((m) => m.id);

/** Klucze ustawień z wybranym modelem dla każdego wariantu. */
export const AI_MODEL_SETTING_KEY: Record<AiVariant, string> = {
  ai: "ai_image_model",
  ai_plus: "ai_image_model_plus",
};

export const AI_MODEL_DEFAULT: Record<AiVariant, string> = {
  ai: "gemini-3.1-flash-image",
  // Wariant „AI+” buduje całą scenę wokół produktu – tu jakość modelu widać najbardziej
  ai_plus: "gemini-3-pro-image",
};

/** Zwraca model z ustawień, o ile jest na allowliście – inaczej domyślny. */
export function resolveAiModel(variant: AiVariant, fromSettings: string): string {
  const value = fromSettings?.trim();
  return value && AI_MODEL_IDS.includes(value) ? value : AI_MODEL_DEFAULT[variant];
}

/** „AI” – produkt na jednolitym, matowym tle (zdjęcie katalogowe). */
export const AI_PROMPT = `A photorealistic, detailed portrait of the specific ceramic product, centrally placed and perfectly sharp, isolated and resting on a seamless, solid matte cappuccino color background surface. Natural, soft, diffused daylight from the side highlights the glaze and texture of the main ceramic piece. Clean, high-end catalog quality, 8k resolution.`;

/** „AI+” – produkt w wystylizowanej scenie (len, eukaliptus, kamienie). */
export const AI_PLUS_PROMPT = `HIGH-RESOLUTION STUDIO PRODUCT PHOTOGRAPHY. A photorealistic, detailed portrait of the specific ceramic product shown in the original image, which must remain EXACTLY unchanged in shape, color, glaze texture, and pattern. The ceramic piece is centrally placed, perfectly sharp. The background is a professionally styled, soft-focus natural studio environment. The ceramic rests on a subtly textured, raw linen tablecloth (cream/natural beige color). Around it, in the softly blurred background, are artfully arranged organic elements: a delicate sprig of eucalyptus, a raw wooden coaster, and a small collection of natural, smooth river pebbles in grey and brown tones. Natural, soft, diffused daylight is coming from the side (softbox effect), highlighting the glaze and texture of the main ceramic piece. Shallow depth of field (bokeh). Clean, high-end catalog quality, 8k resolution, photorealistic, cinematic lighting.`;

export const AI_PROMPTS: Record<AiVariant, string> = {
  ai: AI_PROMPT,
  ai_plus: AI_PLUS_PROMPT,
};

export const AI_VARIANT_LABEL: Record<AiVariant, string> = {
  ai: "AI",
  ai_plus: "AI+",
};

export function isAiVariant(value: unknown): value is AiVariant {
  return value === "ai" || value === "ai_plus";
}

/**
 * Sufiks nazwy pliku nadawany przez `/api/admin/ai-image`. Po nim poznajemy,
 * że zdjęcie już powstało z AI – takiego nie puszczamy przez model po raz drugi
 * (kolejne pokolenie gubi wierność produktu), więc panel ukrywa pod nim przyciski.
 * Nazwy z uploadu i obrotu to `{timestamp}-{losowe}.webp` bez myślnika przed „ai”.
 */
export const AI_IMAGE_SUFFIX = "-ai.webp";

export function isAiGeneratedImage(url: string): boolean {
  return url.split("?")[0].endsWith(AI_IMAGE_SUFFIX);
}

// ── Koszty ────────────────────────────────────────────────────────────────────

/**
 * Stawki Google AI (paid tier, USD za 1 mln tokenów) – stan na 07.2026.
 * Wejście obejmuje prompt i zdjęcie źródłowe, wyjście to wygenerowany obraz.
 * `tokensPerImage` służy do oszacowania kosztu, gdy API nie zwróci liczników.
 */
export const AI_MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number; tokensPerImage: number }
> = {
  "gemini-3.1-flash-image": { inputPer1M: 0.5, outputPer1M: 60, tokensPerImage: 1120 },
  "gemini-3.1-flash-lite-image": { inputPer1M: 0.25, outputPer1M: 30, tokensPerImage: 1120 },
  "gemini-3-pro-image": { inputPer1M: 2, outputPer1M: 120, tokensPerImage: 1120 },
  "gemini-2.5-flash-image": { inputPer1M: 0.3, outputPer1M: 30, tokensPerImage: 1290 },
};

/** Koszt jednego generowania w USD. Nieznany model → 0 (lepiej niż zmyślona kwota). */
export function aiCostUsd(model: string, promptTokens: number, outputTokens: number): number {
  const price = AI_MODEL_PRICING[model];
  if (!price) return 0;
  const usd =
    (promptTokens / 1_000_000) * price.inputPer1M +
    (outputTokens / 1_000_000) * price.outputPer1M;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

/** Orientacyjny koszt jednego zdjęcia – do podglądu stawek w panelu. */
export function aiCostPerImageUsd(model: string): number {
  const price = AI_MODEL_PRICING[model];
  if (!price) return 0;
  return aiCostUsd(model, 0, price.tokensPerImage);
}
