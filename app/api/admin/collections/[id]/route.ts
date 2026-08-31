import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { revalidateCollections } from "@/lib/collections";
import { revalidateProductPages } from "@/lib/products";

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

  const existing = await db.collection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono kolekcji" }, { status: 404 });

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
    // Slug kolekcji siedzi w `Product.collection`, więc zmiana nazwy adresu musi
    // przenieść przypisania – inaczej produkty zostałyby w nieistniejącej serii
    const collection = await db.$transaction(async (tx) => {
      const updated = await tx.collection.update({
        where: { id },
        data: { slug, label: label.trim(), order: typeof order === "number" ? order : 0 },
      });
      if (existing.slug !== slug) {
        await tx.product.updateMany({
          where: { collection: existing.slug },
          data: { collection: slug },
        });
      }
      return updated;
    });
    revalidateCollections();
    revalidateProductPages();
    return NextResponse.json(collection);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Kolekcja z tym slugiem już istnieje" }, { status: 409 });
    }
    console.error("PUT /api/admin/collections/[id]:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const collection = await db.collection.findUnique({ where: { id } });
  if (!collection) return NextResponse.json({ error: "Nie znaleziono kolekcji" }, { status: 404 });

  try {
    // Kolekcja jest opcjonalna, więc usunięcie nie blokuje się na produktach –
    // po prostu wypisujemy je z serii (inaczej niż przy kategoriach, gdzie
    // produkt musi mieć jakąś kategorię i idzie do „inne”)
    await db.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { collection: collection.slug },
        data: { collection: null },
      });
      await tx.collection.delete({ where: { id } });
    });
    revalidateCollections();
    revalidateProductPages();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/collections/[id]:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
