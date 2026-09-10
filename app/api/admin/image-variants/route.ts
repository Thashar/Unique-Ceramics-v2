import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { migrationStatus, processBatch } from "@/lib/image-migration";

/**
 * Migracja zdjęć wgranych, zanim istniały warianty rozmiarowe – obsługa przycisku
 * w panelu (Ustawienia → Zdjęcia). Powód i mechanizm: „Rozmiary zdjęć” w CLAUDE.md.
 *
 * GET  – stan: ile zdjęć w Storage i ilu brakuje wariantów.
 * POST – przetwarza **jedną partię** i zwraca, ile zostało; panel woła ją w pętli.
 *
 * Partie, bo funkcja serverless ma limit czasu, a każde zdjęcie to pobranie pliku
 * plus trzy przebiegi `sharp` z zapisem. `maxDuration` jest ustawione na maksimum
 * planu, a `BATCH_LIMIT` dobrany tak, żeby jedno wywołanie kończyło się z zapasem.
 */
export const maxDuration = 60;

/** Ile zdjęć na jedno wywołanie. Jedno zdjęcie to ok. 1–3 s (pobranie + 3 × sharp). */
const BATCH_LIMIT = 4;
const MAX_BATCH_LIMIT = 10;

function storage() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = storage();
  if (!supabase) {
    return NextResponse.json(
      { error: "Brak konfiguracji magazynu zdjęć (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  try {
    return NextResponse.json(await migrationStatus(supabase));
  } catch (err) {
    console.error("[admin/image-variants] odczyt stanu:", err);
    return NextResponse.json(
      { error: "Nie udało się odczytać listy zdjęć z magazynu." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Każde wywołanie to praca `sharp` i ruch do Storage – limit chroni przed
  // zapętlonym panelem otwartym w kilku kartach naraz. Musi być hojny: przy kilkuset
  // zdjęciach panel woła tę trasę raz na `BATCH_LIMIT` zdjęć, więc jedna migracja
  // katalogu to grubo ponad sto żądań pod rząd
  if (await isRateLimited(`image-variants:${getClientIp(req)}`, 400, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Za dużo żądań – odczekaj chwilę i spróbuj ponownie." },
      { status: 429 }
    );
  }

  const supabase = storage();
  if (!supabase) {
    return NextResponse.json(
      { error: "Brak konfiguracji magazynu zdjęć (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const requested = Number(body?.limit);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(1, Math.trunc(requested)), MAX_BATCH_LIMIT)
    : BATCH_LIMIT;

  try {
    return NextResponse.json(await processBatch(supabase, limit));
  } catch (err) {
    console.error("[admin/image-variants] partia:", err);
    return NextResponse.json(
      { error: "Nie udało się przetworzyć zdjęć – sprawdź logi serwera." },
      { status: 500 }
    );
  }
}
