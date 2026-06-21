import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { revalidateCategories } from "@/lib/categories";

function isValidSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug);
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cats = await db.category.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug, label, order } = await req.json();

  if (!slug || typeof slug !== "string" || slug.length > 60) {
    return NextResponse.json({ error: "Nieprawidłowy slug" }, { status: 400 });
  }
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Slug może zawierać tylko małe litery, cyfry i myślniki" }, { status: 400 });
  }
  if (!label || typeof label !== "string" || label.length > 60) {
    return NextResponse.json({ error: "Nazwa jest wymagana (maks. 60 znaków)" }, { status: 400 });
  }

  try {
    const cat = await db.category.create({
      data: { slug, label: label.trim(), order: typeof order === "number" ? order : 0 },
    });
    revalidateCategories();
    return NextResponse.json(cat, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Kategoria z tym slugiem już istnieje" }, { status: 409 });
    }
    console.error("POST /api/admin/categories:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
