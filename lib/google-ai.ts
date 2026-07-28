// Klient Google AI (Gemini) – tylko serwer. Wysyła zdjęcie + prompt i odbiera
// wygenerowany obraz. Bez SDK: jedno żądanie REST, mniej zależności w bundlu.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Generowanie obrazu bywa wolne – limit poniżej maxDuration trasy. */
const REQUEST_TIMEOUT_MS = 55_000;

export type GeneratedImage = { data: Buffer; mimeType: string };

/** Liczniki tokenów; `estimated` gdy API ich nie podało i policzyliśmy z szacunku. */
export type AiUsage = { promptTokens: number; outputTokens: number; estimated: boolean };

export type GenerationResult = { image: GeneratedImage; usage: AiUsage };

export function hasGoogleAiKey(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
}

type ImageBlock = { data?: unknown; mime_type?: unknown; mimeType?: unknown };

function toImage(block: ImageBlock | null | undefined): GeneratedImage | null {
  const data = typeof block?.data === "string" ? block.data : "";
  if (!data) return null;
  const mime =
    (typeof block?.mime_type === "string" && block.mime_type) ||
    (typeof block?.mimeType === "string" && block.mimeType) ||
    "image/png";
  return { data: Buffer.from(data, "base64"), mimeType: mime };
}

/** Wyciąga pierwszy blok obrazu z odpowiedzi Interactions API. */
function readInteractionsImage(body: unknown): GeneratedImage | null {
  const root = body as Record<string, unknown> | null;
  const direct = toImage(root?.output_image as ImageBlock);
  if (direct) return direct;

  const steps = Array.isArray(root?.steps) ? root.steps : [];
  for (const step of steps) {
    const content = (step as Record<string, unknown>)?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const b = block as Record<string, unknown>;
      if (b?.type !== "image") continue;
      const image = toImage(b as ImageBlock);
      if (image) return image;
    }
  }
  return null;
}

/** Wyciąga obraz z odpowiedzi starszego `models/*:generateContent`. */
function readGenerateContentImage(body: unknown): GeneratedImage | null {
  const candidates = (body as Record<string, unknown>)?.candidates;
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    const parts = (candidate as Record<string, Record<string, unknown>>)?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      const inline = (part as Record<string, unknown>)?.inlineData ??
        (part as Record<string, unknown>)?.inline_data;
      const image = toImage(inline as ImageBlock);
      if (image) return image;
    }
  }
  return null;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/**
 * Liczniki tokenów bywają pod różnymi nazwami: Interactions API zwraca `usage`
 * (snake_case), starsze `generateContent` – `usageMetadata` (camelCase).
 * Czytamy oba warianty; brak liczników sygnalizujemy przez `estimated`.
 */
function readUsage(body: unknown, fallbackOutputTokens: number): AiUsage {
  const root = (body ?? {}) as Record<string, unknown>;
  const usage = (root.usage ?? root.usageMetadata ?? {}) as Record<string, unknown>;

  const promptTokens =
    num(usage.input_tokens) || num(usage.inputTokens) ||
    num(usage.prompt_tokens) || num(usage.promptTokenCount);
  const outputTokens =
    num(usage.output_tokens) || num(usage.outputTokens) ||
    num(usage.candidates_token_count) || num(usage.candidatesTokenCount);

  if (promptTokens || outputTokens) {
    return { promptTokens, outputTokens: outputTokens || fallbackOutputTokens, estimated: false };
  }
  return { promptTokens: 0, outputTokens: fallbackOutputTokens, estimated: true };
}

async function postJson(path: string, payload: unknown, apiKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Przerabia zdjęcie promptem i zwraca wygenerowany obraz.
 *
 * Podstawą jest Interactions API (`/v1beta/interactions`) – to endpoint opisany
 * dziś w dokumentacji modeli obrazowych. Starsze modele bywają wystawione tylko
 * pod `models/{model}:generateContent`, więc przy odmowie 400/404 powtarzamy
 * żądanie tamtą drogą, zamiast zwracać adminowi błąd.
 */
export async function generateProductImage(opts: {
  model: string;
  prompt: string;
  image: GeneratedImage;
  /** Ile tokenów przyjąć za obraz, gdy API nie zwróci liczników. */
  fallbackOutputTokens: number;
}): Promise<GenerationResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) throw new Error("Brak klucza GOOGLE_AI_API_KEY.");

  const base64 = opts.image.data.toString("base64");

  const first = await postJson(
    "/interactions",
    {
      model: opts.model,
      input: [
        { type: "text", text: opts.prompt },
        { type: "image", mime_type: opts.image.mimeType, data: base64 },
      ],
    },
    apiKey
  );

  if (first.ok) {
    const image = readInteractionsImage(first.body);
    if (image) return { image, usage: readUsage(first.body, opts.fallbackOutputTokens) };
    throw new Error("Model nie zwrócił obrazu.");
  }

  if (first.status !== 400 && first.status !== 404) {
    console.error("[google-ai] interactions:", first.status, JSON.stringify(first.body)?.slice(0, 500));
    throw new Error(`Google AI odpowiedziało błędem (${first.status}).`);
  }

  const fallback = await postJson(
    `/models/${encodeURIComponent(opts.model)}:generateContent`,
    {
      contents: [
        {
          role: "user",
          parts: [
            { text: opts.prompt },
            { inline_data: { mime_type: opts.image.mimeType, data: base64 } },
          ],
        },
      ],
    },
    apiKey
  );

  if (!fallback.ok) {
    console.error(
      "[google-ai] generateContent:",
      fallback.status,
      JSON.stringify(fallback.body)?.slice(0, 500)
    );
    throw new Error(`Google AI odpowiedziało błędem (${fallback.status}).`);
  }

  const image = readGenerateContentImage(fallback.body);
  if (!image) throw new Error("Model nie zwrócił obrazu.");
  return { image, usage: readUsage(fallback.body, opts.fallbackOutputTokens) };
}
