import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";
import { resolveOwnImageSource, fetchOwnImage } from "@/lib/image-source";
import { uploadImageWithVariants } from "@/lib/storage-variants";
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

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Zapisujemy pod nową nazwą: to samo zdjęcie może być użyte w innym miejscu
  // (produkt, hero), a nadpisanie zmieniłoby je wszędzie i utknęłoby w cache CDN
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  // Obrót o wielokrotność 90° jest bezstratny geometrycznie – nie zmienia wymiarów
  // poza ich zamianą, więc limit 1920 px z uploadu pozostaje zachowany.
  // Maksymalna jakość jak przy uploadzie – obrót bywa powtarzany, a każdy jest
  // kolejnym pokoleniem kompresji, więc nie ma tu czego oszczędzać.
  // Obrócony plik dostaje własny komplet wariantów rozmiarowych – bez nich
  // `srcSet` w sklepie wskazywałby nieistniejące pliki (patrz `lib/image-variants.ts`).
  let rotated: Buffer;
  try {
    rotated = await sharp(buffer).rotate(angle).toBuffer();
  } catch (e) {
    console.error("[admin/rotate] sharp:", e);
    return NextResponse.json({ error: "Nie udało się obrócić zdjęcia." }, { status: 400 });
  }

  const result = await uploadImageWithVariants(supabase, filename, rotated);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ url: result.url });
}
