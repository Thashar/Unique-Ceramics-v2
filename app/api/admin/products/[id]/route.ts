import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateProductPages } from "@/lib/products";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const { name, slug, description, price, images, category, stock, featured, active, variesFromPhoto } = body;

  const product = await db.product.update({
    where: { id },
    data: { name, slug, description, price, images, category, stock, featured, active, variesFromPhoto: variesFromPhoto ?? false },
  });

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
