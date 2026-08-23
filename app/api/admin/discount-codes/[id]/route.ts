import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { validateDiscountCode } from "@/lib/discount-codes";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const validation = validateDiscountCode(await req.json());
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    // Kod musi zostać unikalny – odrzuć kolizję z innym wpisem
    const clash = await db.discountCode.findUnique({ where: { code: validation.data.code } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "Taki kod już istnieje" }, { status: 409 });
    }
    const updated = await db.discountCode.update({ where: { id }, data: validation.data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[admin/discount-codes] edycja nieudana:", e);
    return NextResponse.json({ error: "Nie udało się zapisać kodu" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    await db.discountCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/discount-codes] usunięcie nieudane:", e);
    return NextResponse.json({ error: "Nie udało się usunąć kodu" }, { status: 500 });
  }
}
