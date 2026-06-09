import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateProductPages } from "@/lib/products";
import { NextResponse } from "next/server";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, slug, description, price, images, category, stock, featured, active } = body;

  const existing = await db.product.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Slug już istnieje" }, { status: 409 });

  const product = await db.product.create({
    data: { name, slug, description, price, images, category, stock, featured, active },
  });

  revalidateProductPages();
  return NextResponse.json(product, { status: 201 });
}
