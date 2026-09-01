import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { validateExternalSale } from "@/lib/external-sale-validation";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane sprzedaży." }, { status: 400 });
  }

  const validation = validateExternalSale(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const updated = await db.externalSale.update({ where: { id }, data: validation.data });
    revalidatePath("/admin/analityki");
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[admin/external-sales] edycja sprzedaży nieudana:", e);
    return NextResponse.json({ error: "Nie udało się zapisać sprzedaży" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  try {
    await db.externalSale.delete({ where: { id } });
    revalidatePath("/admin/analityki");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/external-sales] usunięcie sprzedaży nieudane:", e);
    return NextResponse.json({ error: "Nie udało się usunąć wpisu" }, { status: 500 });
  }
}
