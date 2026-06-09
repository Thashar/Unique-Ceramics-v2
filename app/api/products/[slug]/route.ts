import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // Tylko aktywne produkty — nieaktywne/robocze nie są publiczne
  const product = await db.product.findUnique({ where: { slug, active: true } });
  if (!product) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(product);
}
