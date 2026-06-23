import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { revalidateCategories } from "@/lib/categories";

const PERMANENT_SLUG = "inne";

function isValidSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { slug, label, order } = await req.json();

  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono kategorii" }, { status: 404 });

  // Kategoria domyślna — zezwól tylko na zmianę kolejności
  if (existing.slug === PERMANENT_SLUG) {
    try {
      const cat = await db.category.update({
        where: { id },
        data: { order: typeof order === "number" ? order : existing.order },
      });
      revalidateCategories();
      return NextResponse.json(cat);
    } catch (e) {
      console.error("PUT /api/admin/categories/[id] (permanent):", e);
      return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
    }
  }

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
    const cat = await db.category.update({
      where: { id },
      data: { slug, label: label.trim(), order: typeof order === "number" ? order : 0 },
    });
    revalidateCategories();
    return NextResponse.json(cat);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Kategoria z tym slugiem już istnieje" }, { status: 409 });
    }
    console.error("PUT /api/admin/categories/[id]:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const cat = await db.category.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ error: "Nie znaleziono kategorii" }, { status: 404 });
  if (cat.slug === PERMANENT_SLUG) {
    return NextResponse.json({ error: "Kategoria domyślna nie może być usunięta" }, { status: 409 });
  }

  const productCount = await db.product.count({ where: { category: cat.slug } });

  if (productCount > 0) {
    // Upewnij się że "inne" istnieje, przenieś produkty i usuń kategorię w transakcji
    await db.$transaction(async (tx) => {
      await tx.category.upsert({
        where: { slug: PERMANENT_SLUG },
        update: {},
        create: { slug: PERMANENT_SLUG, label: "Inne", order: 9999 },
      });
      await tx.product.updateMany({
        where: { category: cat.slug },
        data: { category: PERMANENT_SLUG },
      });
      await tx.category.delete({ where: { id } });
    });
  } else {
    await db.category.delete({ where: { id } });
  }

  revalidateCategories();
  return NextResponse.json({ ok: true });
}
