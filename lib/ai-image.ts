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
