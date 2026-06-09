import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

// Klucze przechowujące HTML — sanityzowane już przy zapisie (defense in depth,
// strony i tak sanityzują przy renderze)
const HTML_KEYS = new Set([
  "regulamin",
  "polityka_prywatnosci",
  "about_story",
  "workshops_intro",
]);

function parseBody(body: unknown): { key: string; value: string }[] | null {
  if (!Array.isArray(body)) return null;
  for (const entry of body) {
    if (
      typeof entry !== "object" || entry === null ||
      typeof (entry as Record<string, unknown>).key !== "string" ||
      typeof (entry as Record<string, unknown>).value !== "string"
    ) {
      return null;
    }
  }
  return body as { key: string; value: string }[];
}

async function saveSettings(body: { key: string; value: string }[]) {
  await Promise.all(
    body.map(({ key, value }) => {
      const safeValue = HTML_KEYS.has(key) ? sanitizeRichHtml(value) : value;
      return db.setting.upsert({
        where: { key },
        update: { value: safeValue },
        create: { key, value: safeValue },
      });
    })
  );
  // Strony treściowe są cachowane (ISR) — po zapisie ustawień odśwież wszystko
  revalidatePath("/", "layout");
}

async function handleSave(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = parseBody(await req.json());
  if (!body) {
    return NextResponse.json({ ok: false, error: "Nieprawidłowy format danych" }, { status: 400 });
  }

  try {
    await saveSettings(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/settings] save error:", e);
    return NextResponse.json({ ok: false, error: "Błąd zapisu ustawień" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return handleSave(req);
}

export async function POST(req: Request) {
  return handleSave(req);
}
