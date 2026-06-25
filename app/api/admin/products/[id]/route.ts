import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateProductPages } from "@/lib/products";
import { validateProduct } from "@/lib/product-validation";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const validation = validateProduct(await req.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const data = validation.data;

  // Slug musi pozostać unikalny — odrzuć kolizję z innym produktem
  const clash = await db.product.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) {
    return NextResponse.json({ error: "Slug już istnieje" }, { status: 409 });
  }

  const product = await db.product.update({ where: { id }, data });

  revalidateProductPages();
  return NextResponse.json(product);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await db.product.delete({ where: { id } });

  revalidateProductPages();
  return NextResponse.json({ ok: true });
}
