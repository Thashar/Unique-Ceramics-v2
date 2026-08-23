import { db } from "@/lib/db";
import { activeDiscountPercent } from "@/lib/product-price";
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

  // Na zewnątrz oddajemy rabat obowiązujący teraz – poza oknem wychodzi 0,
  // tak samo jak w katalogu i w kwotach liczonych przy zamówieniu
  return NextResponse.json(
    products.map((p) => ({ ...p, discountPercent: activeDiscountPercent(p) }))
  );
}
