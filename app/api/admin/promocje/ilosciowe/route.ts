import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { listQuantityPromos } from "@/lib/promos";
import { validateQuantityPromo } from "@/lib/quantity-promo";
import { revalidateProductPages } from "@/lib/products";
import { NextResponse } from "next/server";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { available, promos } = await listQuantityPromos();
  return NextResponse.json({ available, promos });
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Złamany JSON nie może kończyć się pięćsetką – to błąd żądania
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane promocji." }, { status: 400 });
  }

  const validation = validateQuantityPromo(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const created = await db.quantityPromo.create({ data: validation.data });
    // Zachęty („Kup 3 szt. i zyskaj −10%”) są renderowane w katalogu i na
    // kartach produktów, więc po zmianie promocji trzeba je przebudować
    revalidateProductPages();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[admin/promocje] zapis rabatu ilościowego nieudany:", e);
    return NextResponse.json(
      { error: "Nie udało się zapisać promocji. Sprawdź, czy tabela promocji istnieje w bazie." },
      { status: 500 }
    );
  }
}
