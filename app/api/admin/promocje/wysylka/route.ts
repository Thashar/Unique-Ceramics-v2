import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { listFreeShippingPromos } from "@/lib/promos";
import { validateFreeShippingPromo } from "@/lib/free-shipping";
import { revalidateProductPages } from "@/lib/products";
import { NextResponse } from "next/server";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { available, promos } = await listFreeShippingPromos();
  return NextResponse.json({ available, promos });
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane promocji." }, { status: 400 });
  }

  const validation = validateFreeShippingPromo(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const created = await db.freeShippingPromo.create({ data: validation.data });
    // Dopisek „Darmowa wysyłka” stoi w katalogu i na kartach produktów
    revalidateProductPages();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[admin/promocje] zapis darmowej wysyłki nieudany:", e);
    return NextResponse.json(
      { error: "Nie udało się zapisać promocji. Sprawdź, czy tabela promocji istnieje w bazie." },
      { status: 500 }
    );
  }
}
