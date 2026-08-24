import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { listDiscountCodes, validateDiscountCode } from "@/lib/discount-codes";
import { NextResponse } from "next/server";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { available, codes } = await listDiscountCodes();
  return NextResponse.json({ available, codes });
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Złamany JSON nie może kończyć się pięćsetką – to błąd żądania
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane kodu." }, { status: 400 });
  }

  const validation = validateDiscountCode(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const existing = await db.discountCode.findUnique({ where: { code: validation.data.code } });
    if (existing) return NextResponse.json({ error: "Taki kod już istnieje" }, { status: 409 });

    const created = await db.discountCode.create({ data: validation.data });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[admin/discount-codes] zapis nieudany:", e);
    return NextResponse.json(
      { error: "Nie udało się zapisać kodu. Sprawdź, czy tabela kodów istnieje w bazie." },
      { status: 500 }
    );
  }
}
