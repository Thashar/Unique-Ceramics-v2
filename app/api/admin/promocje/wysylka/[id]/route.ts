import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { validateFreeShippingPromo } from "@/lib/free-shipping";
import { revalidateProductPages } from "@/lib/products";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane promocji." }, { status: 400 });
  }

  const validation = validateFreeShippingPromo(body);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const updated = await db.freeShippingPromo.update({ where: { id }, data: validation.data });
    revalidateProductPages();
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[admin/promocje] edycja darmowej wysyłki nieudana:", e);
    return NextResponse.json({ error: "Nie udało się zapisać promocji" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    await db.freeShippingPromo.delete({ where: { id } });
    revalidateProductPages();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/promocje] usunięcie darmowej wysyłki nieudane:", e);
    return NextResponse.json({ error: "Nie udało się usunąć promocji" }, { status: 500 });
  }
}
