import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateProductPages } from "@/lib/products";
import { validateProduct } from "@/lib/product-validation";
import { NextResponse } from "next/server";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const validation = validateProduct(await req.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const data = validation.data;

  const existing = await db.product.findUnique({ where: { slug: data.slug } });
  if (existing) return NextResponse.json({ error: "Slug już istnieje" }, { status: 409 });

  const product = await db.product.create({ data });

  revalidateProductPages();
  return NextResponse.json(product, { status: 201 });
}
