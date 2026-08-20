import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
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

  // Konwersja do WebP w maksymalnej jakości (maks. szerokość 1920 px).
  // Plik w Storage ma być wierną kopią oryginału – o tym, co zobaczy odwiedzający,
  // decyduje dopiero `quality` przy renderze (patrz `images.qualities` w next.config.ts).
  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 100 })
      .toBuffer();
  } catch (err) {
    console.error("[admin/upload] sharp:", err);
    return NextResponse.json(
      { error: "Nie udało się przetworzyć obrazu." },
      { status: 400 }
    );
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  // WAŻNE: nie przekazuj Buffera bezpośrednio do `upload()` – supabase-js wysyła go
  // wtedy jako surowe ciało żądania i w środowisku serverless bajty potrafią przejść
  // przez konwersję na tekst UTF-8 (każdy bajt spoza ASCII → U+FFFD), przez co plik
  // w Storage jest uszkodzony. Blob wymusza multipart/form-data – binarnie bezpieczny.
  const blob = new Blob([new Uint8Array(webpBuffer)], { type: "image/webp" });

  const { error } = await supabase.storage
    .from("products")
    .upload(filename, blob, { contentType: "image/webp", upsert: false });

  if (error) {
    console.error("[admin/upload] supabase upload error:", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać pliku w magazynie zdjęć." },
      { status: 500 }
    );
  }

  // Kontrola spójności – gdyby transport znów uszkodził bajty, rozmiar się nie zgodzi.
  // Lepiej odrzucić upload niż zapisać w ustawieniach link do zepsutego zdjęcia.
  // Sam odczyt metadanych jest jednak tylko kontrolą: gdy `info()` zawiedzie
  // (błąd sieci, wyjątek klienta), plik jest już poprawnie zapisany – logujemy
  // i pomijamy sprawdzenie, zamiast wywracać udany upload.
  try {
    const { data: info, error: infoError } = await supabase.storage
      .from("products")
      .info(filename);
    if (infoError) {
      console.warn("[admin/upload] nie udało się odczytać metadanych pliku:", infoError);
    } else if (info && typeof info.size === "number" && info.size !== webpBuffer.byteLength) {
      console.error(
        `[admin/upload] uszkodzony zapis: oczekiwano ${webpBuffer.byteLength} B, zapisano ${info.size} B`
      );
      await supabase.storage.from("products").remove([filename]);
      return NextResponse.json(
        { error: "Plik zapisał się uszkodzony – spróbuj ponownie." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.warn("[admin/upload] wyjątek przy odczycie metadanych pliku:", err);
  }

  const { data } = supabase.storage.from("products").getPublicUrl(filename);

  return NextResponse.json({ url: data.publicUrl });
}
