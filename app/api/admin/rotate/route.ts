import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { resolveOwnImageSource, fetchOwnImage } from "@/lib/image-source";
import { NextResponse } from "next/server";

const ALLOWED_ANGLES = new Set([90, 180, 270]);

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const angle = Number(body?.angle);
  if (!url || !ALLOWED_ANGLES.has(angle)) {
    return NextResponse.json({ error: "Nieprawidłowe dane obrotu." }, { status: 400 });
  }

  const source = resolveOwnImageSource(url, new URL(req.url).origin);
  if (!source) {
    return NextResponse.json({ error: "Nieobsługiwane źródło zdjęcia." }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await fetchOwnImage(source);
  } catch (e) {
    console.error("[admin/rotate] pobranie źródła:", e);
    return NextResponse.json({ error: "Nie udało się pobrać zdjęcia do obrotu." }, { status: 400 });
  }

  // Obrót o wielokrotność 90° jest bezstratny geometrycznie – nie zmienia wymiarów
  // poza ich zamianą, więc limit 1920 px z uploadu pozostaje zachowany.
  // Maksymalna jakość jak przy uploadzie – obrót bywa powtarzany, a każdy jest
  // kolejnym pokoleniem kompresji, więc nie ma tu czego oszczędzać.
  let rotated: Buffer;
  try {
    rotated = await sharp(buffer).rotate(angle).webp({ quality: 100 }).toBuffer();
  } catch (e) {
    console.error("[admin/rotate] sharp:", e);
    return NextResponse.json({ error: "Nie udało się obrócić zdjęcia." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Zapisujemy pod nową nazwą: to samo zdjęcie może być użyte w innym miejscu
  // (produkt, hero), a nadpisanie zmieniłoby je wszędzie i utknęłoby w cache CDN
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  // Blob, nie Buffer – patrz komentarz w /api/admin/upload
  const blob = new Blob([new Uint8Array(rotated)], { type: "image/webp" });

  const { error } = await supabase.storage
    .from("products")
    .upload(filename, blob, { contentType: "image/webp", upsert: false });

  if (error) {
    console.error("[admin/rotate] supabase upload error:", error);
    return NextResponse.json({ error: "Nie udało się zapisać obróconego zdjęcia." }, { status: 500 });
  }

  const { data: info } = await supabase.storage.from("products").info(filename);
  if (info && typeof info.size === "number" && info.size !== rotated.byteLength) {
    console.error(
      `[admin/rotate] uszkodzony zapis: oczekiwano ${rotated.byteLength} B, zapisano ${info.size} B`
    );
    await supabase.storage.from("products").remove([filename]);
    return NextResponse.json(
      { error: "Plik zapisał się uszkodzony – spróbuj ponownie." },
      { status: 500 }
    );
  }

  const { data } = supabase.storage.from("products").getPublicUrl(filename);
  return NextResponse.json({ url: data.publicUrl });
}
