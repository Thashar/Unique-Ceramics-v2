import { db } from "@/lib/db";
import { auth } from "@/auth";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { NextResponse } from "next/server";

// Klucze przechowujące HTML — sanityzowane już przy zapisie (defense in depth,
// strony i tak sanityzują przy renderze)
const HTML_KEYS = new Set([
  "regulamin",
  "polityka_prywatnosci",
  "about_story",
  "workshops_intro",
]);

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
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
}

export async function PATCH(req: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  const body: { key: string; value: string }[] = await req.json();

  try {
    await saveSettings(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/settings] save error:", e);
    return NextResponse.json({ ok: false, error: "Błąd zapisu ustawień" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  const body: { key: string; value: string }[] = await req.json();

  try {
    await saveSettings(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/settings] save error:", e);
    return NextResponse.json({ ok: false, error: "Błąd zapisu ustawień" }, { status: 500 });
  }
}
