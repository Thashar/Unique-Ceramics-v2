import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePortfolioPages } from "@/lib/portfolio";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, images, order, active } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
  }

  try {
    const project = await db.project.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description ?? "",
        images: images ?? [],
        order: parseInt(order) || 0,
        active: active ?? true,
      },
    });
    revalidatePortfolioPages();
    return NextResponse.json(project);
  } catch (e) {
    console.error("PUT /api/admin/portfolio/[id]:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db.project.delete({ where: { id } });
    revalidatePortfolioPages();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/portfolio/[id]:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
