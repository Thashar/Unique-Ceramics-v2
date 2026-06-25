import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePortfolioPages } from "@/lib/portfolio";
import { validateProjectInput } from "@/lib/portfolio-validation";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;

  const validation = validateProjectInput(await req.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const project = await db.project.update({
      where: { id },
      data: validation.data,
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
  if (!await requireAdmin()) {
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
