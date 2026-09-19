import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, withDbRetry } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_AGENT_MODEL_SETTING_KEY,
  AI_DUPLICATE_VARIANT,
  AI_TEXT_LIMITS,
  AI_TEXT_MODEL_SETTING_KEY,
  agentVariant,
  aiCostUsd,
  isAiGeneratedImage,
  resolveAiAgentModel,
} from "@/lib/ai";
import { cleanText, loadImageForText, parseJsonObject } from "@/lib/ai-product-text";
import {
  DUPLICATE_CANDIDATES,
  bestDuplicate,
  buildDuplicatePrompt,
  comparisonImage,
  parseDuplicateVerdicts,
  pickDuplicateCandidates,
  type SimilarityProduct,
} from "@/lib/product-similarity";

// Kilka zdjęć na wejściu i model, który musi je porównać – domyślne 10 s to za mało
export const maxDuration = 60;

/** Ile ofert spoza sklepu w ogóle czytamy z bazy przed zawężeniem tekstowym. */
const POOL = 60;

/** Oferty z kategorii, których dziś nie ma w sklepie – pula przed zawężeniem. */
function readOffShelf(category: string) {
  return withDbRetry(() =>
    db.product.findMany({
      where: { category, OR: [{ stock: { lte: 0 } }, { active: false }] },
      select: {
        id: true, slug: true, name: true, description: true, images: true,
        stock: true, active: true, price: true, collection: true, featured: true,
        discountPercent: true, discountStartsAt: true, discountEndsAt: true,
      },
      take: POOL,
      orderBy: { createdAt: "desc" },
    })
  );
}

/**
 * **Czy ten wzór już kiedyś był w sklepie?** – krok agenta dodawania produktów
 * między potwierdzeniem kategorii a pisaniem karty (ADMIN).
 *
 * `{ url, category, draft }` → `{ match, checked, model, costUsd }`.
 *
 * Porównujemy **wyłącznie z ofertami, których dziś nie ma w sklepie**
 * (`stock = 0` albo `active = false`) – produkt dostępny w sklepie nie może
 * zostać zaproponowany ani wspomniany (decyzja właściciela 19.09.2026). Bez
 * takich ofert w kategorii trasa **nie woła modelu w ogóle** i oddaje
 * `match: null` – zero kosztu.
 *
 * Tekst z rozpoznania tylko zawęża pulę do `DUPLICATE_CANDIDATES`; rozstrzyga
 * porównanie zdjęć w jednym wywołaniu modelu (zdjęcie nowe + zdjęcia ofert).
 * Zasady progu i odrzucania ogólników siedzą w `lib/product-similarity.ts`.
 *
 * `match` niesie pola oferty potrzebne do jej odświeżenia (agent podmienia
 * zdjęcie główne przez `PUT /api/admin/products/[id]`), więc nie trzeba
 * dociągać produktu drugim żądaniem.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isRateLimited(`product-duplicates:${getClientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Za dużo wywołań pod rząd – odczekaj chwilę." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim().toLowerCase() : "";
  const draft = {
    name: cleanText(body?.draft?.name, AI_TEXT_LIMITS.name),
    description: cleanText(body?.draft?.description, AI_TEXT_LIMITS.description),
  };
  if (!url || !category) {
    return NextResponse.json({ error: "Brak zdjęcia albo kategorii." }, { status: 400 });
  }

  // ── Kandydaci: tylko oferty spoza sklepu, zawężone tekstem ──
  let candidates: SimilarityProduct[] = [];
  // Pełne dane oferty (cena, rabat) przydadzą się przy jej odświeżaniu
  let pool: Awaited<ReturnType<typeof readOffShelf>> = [];
  try {
    pool = await readOffShelf(category);
    candidates = pickDuplicateCandidates(
      pool.map((r) => ({ ...r, description: r.description ?? "" })),
      draft,
      DUPLICATE_CANDIDATES
    );
  } catch (e) {
    // Brak porównania nie może zatrzymać dodawania produktu
    console.error("[admin/product-duplicates] odczyt ofert:", e);
    return NextResponse.json({ match: null, checked: 0, costUsd: 0 });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ match: null, checked: 0, costUsd: 0 });
  }

  if (!hasGoogleAiKey()) {
    return NextResponse.json({ match: null, checked: 0, costUsd: 0 });
  }

  // ── Zdjęcia: nowe jako pierwsze, potem oferty w kolejności z promptu ──
  const origin = new URL(req.url).origin;
  let images: { data: Buffer; mimeType: string }[];
  try {
    const own = await loadImageForText(url, origin);
    if (!own) return NextResponse.json({ error: "Nieobsługiwane źródło zdjęcia." }, { status: 400 });
    const rest = await Promise.all(
      candidates.map((c) => loadImageForText(comparisonImage(c, isAiGeneratedImage), origin))
    );
    // Oferta, której zdjęcia nie da się pobrać, wypada z porównania razem ze swoim miejscem
    const usable = candidates.filter((_, i) => rest[i]);
    if (usable.length === 0) return NextResponse.json({ match: null, checked: 0, costUsd: 0 });
    candidates = usable;
    images = [
      { data: own, mimeType: "image/jpeg" },
      ...rest.filter((b): b is Buffer => Boolean(b)).map((data) => ({ data, mimeType: "image/jpeg" })),
    ];
  } catch (e) {
    console.error("[admin/product-duplicates] przygotowanie zdjęć:", e);
    return NextResponse.json({ match: null, checked: 0, costUsd: 0 });
  }

  const settings = await getSettings([AI_AGENT_MODEL_SETTING_KEY, AI_TEXT_MODEL_SETTING_KEY]);
  const model = resolveAiAgentModel(settings[AI_AGENT_MODEL_SETTING_KEY], settings[AI_TEXT_MODEL_SETTING_KEY]);

  let costUsd = 0;
  let match: ReturnType<typeof bestDuplicate> = null;
  try {
    const result = await generateProductText({ model, prompt: buildDuplicatePrompt(draft, candidates), images });
    await recordAiUsage({ kind: "text", variant: agentVariant(AI_DUPLICATE_VARIANT), model, ...result.usage });
    costUsd = aiCostUsd(model, result.usage.promptTokens, result.usage.outputTokens);
    match = bestDuplicate(parseDuplicateVerdicts(parseJsonObject(result.text), candidates.length), candidates);
  } catch (e) {
    // Nieudane porównanie = brak propozycji; agent leci dalej z nową ofertą
    console.error("[admin/product-duplicates] porównanie:", e);
    return NextResponse.json({ match: null, checked: candidates.length, model, costUsd });
  }

  if (!match) {
    return NextResponse.json({ match: null, checked: candidates.length, model, costUsd });
  }

  const full = pool.find((p) => p.id === match.product.id);
  return NextResponse.json({
    match: {
      id: match.product.id,
      slug: match.product.slug,
      name: match.product.name,
      description: match.product.description,
      images: match.product.images,
      stock: match.product.stock,
      active: match.product.active,
      price: full?.price ?? 0,
      collection: full?.collection ?? null,
      featured: full?.featured ?? false,
      discountPercent: full?.discountPercent ?? 0,
      discountStartsAt: full?.discountStartsAt ?? null,
      discountEndsAt: full?.discountEndsAt ?? null,
      category,
      confidence: match.row.confidence,
      matched: match.row.matched,
      differences: match.row.differences,
    },
    checked: candidates.length,
    model,
    costUsd,
  });
}
