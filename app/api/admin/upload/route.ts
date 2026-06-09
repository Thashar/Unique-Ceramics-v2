import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "Brak pliku" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
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

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Weryfikacja magic bytes — nie ufamy nagłówkowi Content-Type z klienta
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.length > 11 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) {
    return NextResponse.json(
      { error: "Plik nie jest prawidłowym obrazem." },
      { status: 400 }
    );
  }

  const { error } = await supabase.storage
    .from("products")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from("products").getPublicUrl(filename);

  return NextResponse.json({ url: data.publicUrl });
}
