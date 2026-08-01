// Wywołania Google AI (Gemini) – wspólne definicje dla panelu admina
// (wybór modeli, przyciski AI / AI+ i „Uzupełnij przy użyciu AI”) oraz tras serwerowych.
// Moduł jest neutralny (same stałe) – może trafić do bundle klienta.

/** Rodzaj wywołania – rozdziela koszty zdjęć od kosztów tekstu. */
export type AiKind = "image" | "text";

/** Warianty generowania dostępne przy każdym zdjęciu produktu. */
export type AiVariant = "ai" | "ai_plus";

/** Wariant zapisywany dla uzupełniania danych produktu tekstem. */
export const AI_TEXT_VARIANT = "product_fill";

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

/**
 * Zasada kompletu – wspólna dla obu wariantów. Zdjęcie źródłowe bywa zestawem
 * (np. dzbanek z kubkami), a model albo gubił część sztuk, albo dokładał własne.
 * Sformułowana tak, żeby nie kolidowała z rekwizytami sceny w wariancie „AI+”:
 * zakaz dotyczy ceramiki i elementów produktu, nie lnu czy eukaliptusa.
 */
const SET_RULE = `CRITICAL - keep the set complete and unchanged: the generated image must show EVERY ceramic item visible in the original photo, all of them together, with the same number of pieces, the same shapes, colors, glaze and decorations. Do not drop, merge or hide any piece, and do not invent or add any extra ceramic items, tableware, lids, saucers or product parts that are not present in the original photo.`;

/**
 * Zasada kadru – wspólna dla obu wariantów. Galeria w sklepie ma kadr 4:3
 * poziomy, więc pionowe zdjęcie źródłowe ma zostać przekomponowane na poziome:
 * przez dołożenie tła po bokach, nie przez obcięcie albo rozciągnięcie produktu.
 */
const ORIENTATION_RULE = `OUTPUT FORMAT: the generated image must always be HORIZONTAL (landscape orientation, roughly 4:3, wider than it is tall), even when the original photo is vertical (portrait). If the original is vertical, recompose the shot into a horizontal frame by extending the background and the surface to the left and right of the product - never by cropping any part of the ceramic, never by stretching, squashing or rotating it, and never by adding black bars. The whole product stays visible, upright and correctly proportioned, with comfortable margins around it.`;

/**
 * Zasada wierności kolorów – wspólna dla obu wariantów. Modele obrazowe lubią
 * „poprawiać” zdjęcie: ocieplać szkliwo, podbijać nasycenie, zamieniać chłodne
 * szarości w beże. Dla sklepu to realny problem – klient dostaje wtedy produkt
 * w innym kolorze niż na zdjęciu. Stąd osobna, dobitna reguła.
 */
const COLOR_RULE = `COLOR FIDELITY IS MANDATORY: reproduce the exact colors of the ceramic from the original photo - the same hue, saturation, lightness and glaze tone on every piece, including subtle shifts, speckles, streaks, crackle and color transitions of the glaze. Sample the colors from the original image and match them precisely; a cool grey stays cool grey, a muted blue stays muted blue, an off-white stays off-white. Do NOT restyle, recolor, tint, warm up, cool down, saturate, desaturate, brighten or "improve" the ceramic. Do not let the background color, the props or the lighting cast a color tint onto the product. The white balance must stay neutral so that the glaze color is identical to the original. Only the background, framing and lighting may change - the product's color must not.`;

/**
 * Zasada wielkości – wspólna dla obu wariantów. Modele lubiły "dopasować"
 * produkt do kadru: powiększać go przy pustym tle albo pomniejszać w scenie
 * z rekwizytami. Klient ocenia realny rozmiar po zdjęciu, więc zmiana skali
 * jest tu równie szkodliwa jak zmiana koloru.
 */
const SIZE_RULE = `SIZE FIDELITY IS MANDATORY: the ceramic product must keep the exact same real-world scale and proportions as in the original photo, relative to its own height and width - do not enlarge it, shrink it, zoom in on it or zoom out from it. Do not fill more or less of the frame with the product than a proportional recomposition of the original would require; only the amount of empty background or surrounding props may change to fit the new frame, never the size of the product itself. If several pieces are shown, keep their sizes relative to each other exactly as in the original photo.`;

/**
 * „AI” – produkt na jednolitym, matowym tle (zdjęcie katalogowe).
 * Kolor tła celowo odpowiada kolorowi `sand` (#E8DFD0) z palety sklepu –
 * tym samym, co przycisk „Wyprzedano”. Zmieniając odcień, popraw też paletę w opisie.
 */
export const AI_PROMPT = `A photorealistic, detailed portrait of the specific ceramic product, centrally placed and perfectly sharp, isolated and resting on a seamless, solid matte background surface in a light warm sand beige tone (hex #E8DFD0) - a pale, soft, light background, definitely not dark, not brown and not grey. Natural, soft, diffused daylight from the side highlights the glaze and texture of the main ceramic piece. Clean, high-end catalog quality, 8k resolution. ${ORIENTATION_RULE} ${COLOR_RULE} ${SET_RULE} ${SIZE_RULE} If the original photo shows several pieces, arrange them all together in one balanced composition on that same background.`;

/** „AI+” – produkt w wystylizowanej scenie (len, eukaliptus, kamienie). */
export const AI_PLUS_PROMPT = `HIGH-RESOLUTION STUDIO PRODUCT PHOTOGRAPHY. A photorealistic, detailed portrait of the specific ceramic product shown in the original image, which must remain EXACTLY unchanged in shape, color, glaze texture, and pattern. The ceramic piece is centrally placed, perfectly sharp. The background is a professionally styled, soft-focus natural studio environment. The ceramic rests on a subtly textured, raw linen tablecloth (cream/natural beige color). Around it, in the softly blurred background, are artfully arranged organic elements: a delicate sprig of eucalyptus, a raw wooden coaster, and a small collection of natural, smooth river pebbles in grey and brown tones. Natural, soft, diffused daylight is coming from the side (softbox effect), highlighting the glaze and texture of the main ceramic piece. Shallow depth of field (bokeh). Clean, high-end catalog quality, 8k resolution, photorealistic, cinematic lighting. ${ORIENTATION_RULE} ${COLOR_RULE} ${SET_RULE} ${SIZE_RULE} If the original photo shows several pieces, place them all together in the scene as one set; the eucalyptus, wooden coaster and pebbles are the only added props and they must stay in the blurred background.`;

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

// ── Opis produktu z AI (tekst) ───────────────────────────────────────────────

/**
 * Modele tekstowe (multimodalne – dostają zdjęcie i odpowiadają tekstem).
 * Jak wyżej: allowlista, bo nazwa modelu trafia do adresu API.
 */
export const AI_TEXT_MODELS = [
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (tani, zalecany)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (najlepszy opis)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (najtańszy)" },
] as const;

const AI_TEXT_MODEL_IDS: string[] = AI_TEXT_MODELS.map((m) => m.id);

export const AI_TEXT_MODEL_SETTING_KEY = "ai_text_model";
export const AI_TEXT_MODEL_DEFAULT = "gemini-3.5-flash-lite";

export function resolveAiTextModel(fromSettings: string): string {
  const value = fromSettings?.trim();
  return value && AI_TEXT_MODEL_IDS.includes(value) ? value : AI_TEXT_MODEL_DEFAULT;
}

/** Maksymalne długości pól zwracanych przez model (i tak walidowane serwerowo). */
export const AI_TEXT_LIMITS = { name: 200, slug: 200, description: 600 };

/**
 * Prompt do uzupełnienia danych produktu ze zdjęcia. Kategorie podajemy modelowi,
 * bo ma wybrać istniejącą – wymyślona i tak zostałaby odrzucona przy walidacji.
 */
export function buildProductFillPrompt(categories: { slug: string; label: string }[]): string {
  const list = categories.map((c) => `- ${c.slug} (${c.label})`).join("\n");
  return `Jesteś asystentem sklepu z ręcznie robioną ceramiką artystyczną (Unique Ceramics).
Na podstawie zdjęcia produktu przygotuj dane do karty produktu w sklepie.

Najpierw przyjrzyj się uważnie samej ceramice i rozpoznaj, co się na niej znajduje:
- motyw lub wizerunek (np. zwierzę, roślina, twarz, postać, pejzaż, ornament, wzór geometryczny),
- napis, litery, cyfry, symbol lub znak,
- charakterystyczny kształt i detale formy (np. wytłoczenia, żłobienia, uchwyt, nóżki, falowana krawędź, nieregularny brzeg).
To, co widzisz na przedmiocie, jest najważniejszą cechą produktu – musi trafić i do nazwy, i do opisu.
Nazywaj to wprost i konkretnie ("kubek z sową", "miska z liściem monstery", "talerz z napisem Dzień dobry"),
a nie ogólnikami w rodzaju "z motywem" czy "ze wzorem". Jeśli nie masz pewności, co przedstawia motyw,
opisz go tak, jak wygląda, zamiast zgadywać konkretną nazwę.

Zasady:
- Pisz po polsku, w tonie spokojnym i rzeczowym, bez marketingowego przesadzania.
- Jako myślnika używaj wyłącznie półpauzy "–" (krótki myślnik). Nigdy nie używaj pauzy "—" (długi myślnik, em dash) ani encji &mdash;.
- "name": krótka nazwa produktu (2-5 słów), bez cudzysłowów i bez ceny; jeśli na ceramice jest motyw, wizerunek, znak lub napis, nazwa musi go zawierać.
- "slug": nazwa zapisana małymi literami, bez polskich znaków, wyrazy połączone myślnikami (tylko a-z, 0-9 i myślnik).
- "category": wybierz dokładnie jedną wartość slug z poniższej listy kategorii. Jeśli żadna nie pasuje, wpisz pusty ciąg.
- "description": 1-2 zdania. Zacznij od tego, co to za przedmiot i co go zdobi (motyw, wizerunek, znak, napis) oraz gdzie to zdobienie jest umieszczone, a potem dodaj kształt, kolor, szkliwo i fakturę. Gdy przedmiot jest gładki i bez zdobień, napisz o formie i wykończeniu. Nie wymyślaj wymiarów, pojemności ani ceny.

Dostępne kategorie:
${list || "- (brak zdefiniowanych kategorii)"}

Odpowiedz wyłącznie obiektem JSON, bez komentarzy i bez bloków kodu:
{"name":"...","slug":"...","category":"...","description":"..."}`;
}

// ── Koszty ────────────────────────────────────────────────────────────────────

/**
 * Stawki Google AI (paid tier, USD za 1 mln tokenów) – stan na 07.2026.
 * Wejście obejmuje prompt i zdjęcie źródłowe, wyjście to wygenerowany obraz lub tekst.
 * `tokensPerImage` służy do oszacowania kosztu modeli obrazowych, gdy API nie zwróci liczników.
 */
export const AI_MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number; tokensPerImage: number; kind: AiKind }
> = {
  // Modele obrazowe
  "gemini-3.1-flash-image": { inputPer1M: 0.5, outputPer1M: 60, tokensPerImage: 1120, kind: "image" },
  "gemini-3.1-flash-lite-image": { inputPer1M: 0.25, outputPer1M: 30, tokensPerImage: 1120, kind: "image" },
  "gemini-3-pro-image": { inputPer1M: 2, outputPer1M: 120, tokensPerImage: 1120, kind: "image" },
  "gemini-2.5-flash-image": { inputPer1M: 0.3, outputPer1M: 30, tokensPerImage: 1290, kind: "image" },
  // Modele tekstowe
  "gemini-3.6-flash": { inputPer1M: 1.5, outputPer1M: 7.5, tokensPerImage: 0, kind: "text" },
  "gemini-3.5-flash-lite": { inputPer1M: 0.3, outputPer1M: 2.5, tokensPerImage: 0, kind: "text" },
  "gemini-3.1-flash-lite": { inputPer1M: 0.25, outputPer1M: 1.5, tokensPerImage: 0, kind: "text" },
  "gemini-2.5-flash": { inputPer1M: 0.3, outputPer1M: 2.5, tokensPerImage: 0, kind: "text" },
  "gemini-2.5-flash-lite": { inputPer1M: 0.1, outputPer1M: 0.4, tokensPerImage: 0, kind: "text" },
};

/** Rodzaj modelu wg cennika; nieznany traktujemy jak obrazowy (tak było wcześniej). */
export function aiModelKind(model: string): AiKind {
  return AI_MODEL_PRICING[model]?.kind ?? "image";
}

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
