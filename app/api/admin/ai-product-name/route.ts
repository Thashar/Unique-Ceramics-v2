import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, withDbRetry } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { generateProductText, hasGoogleAiKey } from "@/lib/google-ai";
import { recordAiUsage } from "@/lib/ai-usage";
import {
  AI_AGENT_MODEL_SETTING_KEY,
  AI_NAME_EXAMPLES,
  AI_NAME_VARIANT,
  AI_TEXT_LIMITS,
  AI_TEXT_MODEL_SETTING_KEY,
  agentVariant,
  aiCostUsd,
  buildProductNamePrompt,
  resolveAiAgentModel,
} from "@/lib/ai";
import { cleanText, normalizeSlug, parseJsonObject } from "@/lib/ai-product-text";

// Wywołanie jest tekstowe i krótkie, ale model bywa rozmowny
export const maxDuration = 60;

/** Z ilu ostatnich produktów kategorii losujemy wzory nazw. */
const POOL = 40;

/**
 * **Nazwa przedmiotu w konwencji kategorii** (ADMIN) – krok agenta dodawania
 * produktów po zmianie kategorii albo po poprawce właściciela („to nie miska,
 * tylko czarka”).
 *
 * `{ category, subject, description }` → `{ name, slug, examples, model, costUsd }`.
 *
 * ⚠️ **Rodzaj przedmiotu pochodzi wyłącznie z `subject`** – czyli od właściciela.
 * Wzory z kategorii (`AI_NAME_EXAMPLES` = 3 losowe z ostatnich 40) dają samą
 * konwencję nazewniczą; prompt wprost zabrania przenoszenia z nich rodzaju
 * przedmiotu, bo to właśnie tak „misa ażurowa” stawała się „misą ramenową”
 * (zgłoszone 19.09.2026).
 *
 * Wywołanie idzie **bez zdjęcia** – co to za przedmiot, już wiemy, więc płacimy
 * tylko za krótki tekst. Bez wzorów w kategorii trasa nie woła modelu i oddaje
 * `subject` jako nazwę: agent i tak pokaże ją właścicielowi.
 */
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await isRateLimited(`ai-product-name:${getClientIp(req)}`, 60, 10 * 60_000)) {
    return NextResponse.json({ error: "Za dużo wywołań pod rząd – odczekaj chwilę." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const requestedCategory = typeof body?.category === "string" ? body.category.trim().toLowerCase() : "";
  const subject = cleanText(body?.subject, AI_TEXT_LIMITS.name);
  const description = cleanText(body?.description, AI_TEXT_LIMITS.description);
  if (!requestedCategory || !subject) {
    return NextResponse.json({ error: "Brak kategorii albo opisu przedmiotu." }, { status: 400 });
  }

  const categories = await getCategories();
  const category = categories.find((c) => c.slug === requestedCategory);
  if (!category) return NextResponse.json({ error: "Nieznana kategoria." }, { status: 400 });

  // Wzory nazewnictwa z kategorii – losowe, bo chodzi o konwencję, nie ranking
  let examples: string[] = [];
  try {
    const rows = await withDbRetry(() =>
      db.product.findMany({
        where: { category: category.slug, active: true },
        select: { name: true },
        take: POOL,
        orderBy: { createdAt: "desc" },
      })
    );
    examples = rows
      .map((r) => ({ name: r.name, key: Math.random() }))
      .sort((a, b) => a.key - b.key)
      .slice(0, AI_NAME_EXAMPLES)
      .map((r) => r.name);
  } catch (e) {
    // Brak wzorów nie zatrzymuje przebiegu – nazwą zostanie to, co powiedział właściciel
    console.error("[admin/ai-product-name] odczyt wzorów:", e);
  }

  const fallback = { name: subject, slug: normalizeSlug(subject), examples, costUsd: 0 };
  if (examples.length === 0 || !hasGoogleAiKey()) {
    return NextResponse.json(fallback);
  }

  const settings = await getSettings([AI_AGENT_MODEL_SETTING_KEY, AI_TEXT_MODEL_SETTING_KEY]);
  const model = resolveAiAgentModel(settings[AI_AGENT_MODEL_SETTING_KEY], settings[AI_TEXT_MODEL_SETTING_KEY]);

  try {
    const result = await generateProductText({
      model,
      prompt: buildProductNamePrompt({ category, subject, description, examples }),
    });
    await recordAiUsage({ kind: "text", variant: agentVariant(AI_NAME_VARIANT), model, ...result.usage });
    const costUsd = aiCostUsd(model, result.usage.promptTokens, result.usage.outputTokens);
    const parsed = parseJsonObject(result.text);
    const name = cleanText(parsed?.name, AI_TEXT_LIMITS.name) || subject;
    return NextResponse.json({
      name,
      slug: normalizeSlug(cleanText(parsed?.slug, AI_TEXT_LIMITS.slug)) || normalizeSlug(name),
      examples,
      model,
      costUsd,
    });
  } catch (e) {
    // Nazwa od właściciela jest wystarczająco dobra – nie przerywamy dodawania
    console.error("[admin/ai-product-name] nazwa:", e);
    return NextResponse.json(fallback);
  }
}
