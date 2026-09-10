import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { removeUnused, scanStorage } from "@/lib/storage-usage";

/**
 * Sprzątanie **nieużywanych plików** w magazynie zdjęć (Ustawienia → Zdjęcia).
 *
 * GET  – skan: ile plików, ile używanych, lista kandydatów do usunięcia.
 * POST – usuwa wskazane nazwy, ale **tylko te, które skan uznał za nieużywane**
 *        (weryfikacja jest w `removeUnused` – nazwom z żądania nie ufamy).
 *
 * Skan czyta całą bazę i całą listę magazynu, więc trwa; `maxDuration` na maksimum.
 */
export const maxDuration = 60;

/** Ile nazw przyjmujemy w jednym żądaniu – tyle, ile może być plików w magazynie. */
const MAX_NAMES = 5000;

function storage() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

const MISSING_KEYS = {
  error: "Brak konfiguracji magazynu zdjęć (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
};

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = storage();
  if (!supabase) return NextResponse.json(MISSING_KEYS, { status: 500 });

  try {
    return NextResponse.json(await scanStorage(supabase));
  } catch (err) {
    console.error("[admin/storage-cleanup] skan:", err);
    return NextResponse.json(
      { error: "Nie udało się sprawdzić magazynu – sprawdź logi serwera." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Kasowanie jest nieodwracalne – limit chroni przed zapętlonym panelem
  if (await isRateLimited(`storage-cleanup:${getClientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Za dużo żądań – odczekaj chwilę i spróbuj ponownie." },
      { status: 429 }
    );
  }

  const supabase = storage();
  if (!supabase) return NextResponse.json(MISSING_KEYS, { status: 500 });

  const body = await req.json().catch(() => null);
  const names = Array.isArray(body?.names)
    ? body.names.filter((n: unknown): n is string => typeof n === "string").slice(0, MAX_NAMES)
    : [];
  if (!names.length) {
    return NextResponse.json({ error: "Nie wskazano plików do usunięcia." }, { status: 400 });
  }

  try {
    return NextResponse.json(await removeUnused(supabase, names));
  } catch (err) {
    console.error("[admin/storage-cleanup] usuwanie:", err);
    return NextResponse.json(
      { error: "Nie udało się usunąć plików – sprawdź logi serwera." },
      { status: 500 }
    );
  }
}
