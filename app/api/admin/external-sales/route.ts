import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { validateExternalSale } from "@/lib/external-sale-validation";
import { listExternalSales } from "@/lib/external-sales";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { available, sales } = await listExternalSales();
  return NextResponse.json({ available, sales });
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane sprzedaży." }, { status: 400 });
  }

  const validation = validateExternalSale(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const created = await db.externalSale.create({ data: validation.data });
    revalidatePath("/admin/analityki");
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[admin/external-sales] zapis sprzedaży nieudany:", e);
    return NextResponse.json(
      { error: "Nie udało się zapisać sprzedaży. Sprawdź, czy tabela ExternalSale istnieje w bazie." },
      { status: 500 }
    );
  }
}
