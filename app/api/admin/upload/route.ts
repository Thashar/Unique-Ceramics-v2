import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { uploadImageWithVariants } from "@/lib/storage-variants";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  // Cała trasa jest opakowana w try/catch – bez tego każdy nieprzewidziany wyjątek
  // (brak zmiennej środowiskowej, błąd Prismy w `requireAdmin`, wyjątek z klienta
  // Storage) kończył się odpowiedzią 500 z HTML-em zamiast JSON-a. Panel nie miał
  // wtedy czego pokazać i wyświetlał samo „nie udało się wgrać zdjęcia (błąd 500)”,
  // bez wskazówki, co naprawdę zawiodło.
  try {
    return await handleUpload(req);
  } catch (err) {
    console.error("[admin/upload] nieoczekiwany błąd:", err);
    return NextResponse.json(
      { error: "Nieoczekiwany błąd serwera przy wgrywaniu zdjęcia – sprawdź logi serwera." },
      { status: 500 }
    );
  }
}

async function handleUpload(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Brak konfiguracji Storage jest częstym powodem błędu na środowisku lokalnym
  // (.env bez kluczy Supabase) – `createClient` rzucałby wtedy „supabaseUrl is required”.
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    console.error("[admin/upload] brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      { error: "Brak konfiguracji magazynu zdjęć (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "Brak pliku" }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Niedozwolony typ pliku. Dozwolone: JPG, PNG, WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Plik jest za duży (maks. 10 MB)." },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Weryfikacja magic bytes – nie ufamy nagłówkowi Content-Type z klienta
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.length > 11 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) {
    return NextResponse.json(
      { error: "Plik nie jest prawidłowym obrazem." },
      { status: 400 }
    );
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  // Oryginał w maksymalnej jakości (maks. 1920 px) plus komplet wariantów
  // rozmiarowych. Warianty zastępują optymalizator Vercela – powstają raz, tutaj,
  // zamiast być przeliczane przy każdym wyświetleniu (patrz `next.config.ts`).
  const result = await uploadImageWithVariants(supabase, filename, buffer);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ url: result.url });
}
