import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kategoria = searchParams.get("kategoria");
  const exclude = searchParams.get("exclude");

  const products = await db.product.findMany({
    where: {
      active: true,
      stock: { gt: 0 },
      ...(kategoria ? { category: kategoria } : {}),
      ...(exclude ? { id: { not: exclude } } : {}),
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(products);
}
