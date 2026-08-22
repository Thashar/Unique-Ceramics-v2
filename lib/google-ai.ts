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

// Liczniki tokenów przychodzą pod różnymi nazwami – Interactions API używa
// snake_case (`usage.input_tokens`), starsze `generateContent` camelCase
// (`usageMetadata.promptTokenCount`), a część odpowiedzi miesza konwencje
// (`prompt_token_count`). Dlatego zamiast kilku sztywnych pól sprawdzamy pełną
// listę aliasów po obu stronach – wcześniej lista wejściowa była krótsza niż
// wyjściowa, więc przy nietrafionej nazwie wejście liczyło się jako zero
// i koszt tokenów wejściowych przepadał.
const PROMPT_KEYS = [
  "input_tokens", "inputTokens", "input_token_count", "inputTokenCount",
  "prompt_tokens", "promptTokens", "prompt_token_count", "promptTokenCount",
];
const OUTPUT_KEYS = [
  "output_tokens", "outputTokens", "output_token_count", "outputTokenCount",
  "completion_tokens", "completionTokens",
  "candidates_tokens", "candidatesTokens", "candidates_token_count", "candidatesTokenCount",
];
/** Tokeny „myślenia” są rozliczane jak wyjściowe, a bywają podane osobno. */
const THOUGHT_KEYS = [
  "thoughts_token_count", "thoughtsTokenCount",
  "reasoning_tokens", "reasoningTokens", "thinking_tokens", "thinkingTokens",
];
const TOTAL_KEYS = [
  "total_tokens", "totalTokens", "total_token_count", "totalTokenCount",
];

function pick(usage: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = num(usage[key]);
    if (value) return value;
  }
  return 0;
}

/** Zbiera obiekty z licznikami z miejsc, w których API potrafi je umieścić. */
function collectUsageObjects(body: unknown): Record<string, unknown>[] {
  const root = (body ?? {}) as Record<string, unknown>;
  const found: Record<string, unknown>[] = [];

  const push = (value: unknown) => {
    if (value && typeof value === "object") found.push(value as Record<string, unknown>);
  };

  push(root.usage);
  push(root.usageMetadata);
  push(root.usage_metadata);
  push((root.response as Record<string, unknown> | undefined)?.usageMetadata);

  // Interactions API potrafi rozbić zużycie na poszczególne kroki
  if (found.length === 0 && Array.isArray(root.steps)) {
    for (const step of root.steps) {
      const s = step as Record<string, unknown>;
      push(s?.usage);
      push(s?.usageMetadata);
    }
  }
  return found;
}

/**
 * Wyciąga liczniki tokenów z odpowiedzi modelu. Sumuje wejście i wyjście
 * (tokeny „myślenia” doliczamy do wyjścia, bo tak są rozliczane), a gdy API
 * poda tylko sumę i jedną ze stron – drugą wylicza z różnicy.
 * `estimated` oznacza, że nie było żadnych liczników i koszt jest z szacunku.
 */
function readUsage(body: unknown, fallbackOutputTokens: number): AiUsage {
  let promptTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  for (const usage of collectUsageObjects(body)) {
    promptTokens += pick(usage, PROMPT_KEYS);
    outputTokens += pick(usage, OUTPUT_KEYS) + pick(usage, THOUGHT_KEYS);
    totalTokens += pick(usage, TOTAL_KEYS);
  }

  // Gdy znamy sumę i tylko jedną stronę, druga wynika z różnicy
  if (totalTokens > 0) {
    if (!outputTokens && promptTokens && totalTokens > promptTokens) {
      outputTokens = totalTokens - promptTokens;
    } else if (!promptTokens && outputTokens && totalTokens > outputTokens) {
      promptTokens = totalTokens - outputTokens;
    }
  }

  if (promptTokens || outputTokens) {
    return { promptTokens, outputTokens: outputTokens || fallbackOutputTokens, estimated: false };
  }

  // Nic nie rozpoznaliśmy – zapisz kształt odpowiedzi, żeby dało się dopisać alias
  console.error(
    "[google-ai] brak liczników tokenów w odpowiedzi:",
    JSON.stringify(collectUsageObjects(body))?.slice(0, 300) || "(brak obiektu usage)"
  );
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

/** Tekst z odpowiedzi Interactions API (skrót `output_text` albo bloki w krokach). */
function readInteractionsText(body: unknown): string {
  const root = body as Record<string, unknown> | null;
  if (typeof root?.output_text === "string" && root.output_text.trim()) return root.output_text;

  const steps = Array.isArray(root?.steps) ? root.steps : [];
  const parts: string[] = [];
  for (const step of steps) {
    const content = (step as Record<string, unknown>)?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const b = block as Record<string, unknown>;
      // Bloki „thought” nie są odpowiedzią – bierzemy tylko zwykły tekst
      if (b?.type === "text" && typeof b.text === "string") parts.push(b.text);
    }
  }
  return parts.join("\n").trim();
}

/** Tekst z odpowiedzi starszego `models/*:generateContent`. */
function readGenerateContentText(body: unknown): string {
  const candidates = (body as Record<string, unknown>)?.candidates;
  if (!Array.isArray(candidates)) return "";
  const parts: string[] = [];
  for (const candidate of candidates) {
    const list = (candidate as Record<string, Record<string, unknown>>)?.content?.parts;
    if (!Array.isArray(list)) continue;
    for (const part of list) {
      const text = (part as Record<string, unknown>)?.text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n").trim();
}

/**
 * Wysyła prompt i zdjęcie do modelu, zwraca surową odpowiedź.
 *
 * Podstawą jest Interactions API (`/v1beta/interactions`) – to endpoint opisany
 * dziś w dokumentacji modeli. Część modeli bywa wystawiona tylko pod
 * `models/{model}:generateContent`, więc przy odmowie 400/404 powtarzamy
 * żądanie tamtą drogą, zamiast zwracać adminowi błąd.
 */
async function callGemini(model: string, prompt: string, image?: GeneratedImage) {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) throw new Error("Brak klucza GOOGLE_AI_API_KEY.");

  // Zdjęcie jest opcjonalne – układanie promptu ze słownego opisu idzie bez niego
  const imagePart = image
    ? { type: "image", mime_type: image.mimeType, data: image.data.toString("base64") }
    : null;

  const first = await postJson(
    "/interactions",
    {
      model,
      input: [
        { type: "text", text: prompt },
        ...(imagePart ? [imagePart] : []),
      ],
    },
    apiKey
  );
  if (first.ok) return { body: first.body, viaInteractions: true };

  if (first.status !== 400 && first.status !== 404) {
    console.error("[google-ai] interactions:", first.status, JSON.stringify(first.body)?.slice(0, 500));
    throw new Error(`Google AI odpowiedziało błędem (${first.status}).`);
  }

  const fallback = await postJson(
    `/models/${encodeURIComponent(model)}:generateContent`,
    {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...(image
              ? [{ inline_data: { mime_type: image.mimeType, data: image.data.toString("base64") } }]
              : []),
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
  return { body: fallback.body, viaInteractions: false };
}

/** Przerabia zdjęcie promptem i zwraca wygenerowany obraz. */
export async function generateProductImage(opts: {
  model: string;
  prompt: string;
  image: GeneratedImage;
  /** Ile tokenów przyjąć za obraz, gdy API nie zwróci liczników. */
  fallbackOutputTokens: number;
}): Promise<GenerationResult> {
  const { body, viaInteractions } = await callGemini(opts.model, opts.prompt, opts.image);
  const image = viaInteractions ? readInteractionsImage(body) : readGenerateContentImage(body);
  if (!image) throw new Error("Model nie zwrócił obrazu.");
  return { image, usage: readUsage(body, opts.fallbackOutputTokens) };
}

/**
 * Odpowiedź tekstowa modelu. Zdjęcie jest opcjonalne: uzupełnianie danych
 * produktu je przekazuje, układanie promptu ze słownego opisu – nie.
 */
export async function generateProductText(opts: {
  model: string;
  prompt: string;
  image?: GeneratedImage;
}): Promise<{ text: string; usage: AiUsage }> {
  const { body, viaInteractions } = await callGemini(opts.model, opts.prompt, opts.image);
  const text = viaInteractions ? readInteractionsText(body) : readGenerateContentText(body);
  if (!text) throw new Error("Model nie zwrócił tekstu.");
  // Przy tekście nie ma sensownego szacunku tokenów – 0 oznacza „koszt nieznany”
  return { text, usage: readUsage(body, 0) };
}
