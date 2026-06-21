import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePortfolioPages } from "@/lib/portfolio";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  try {
    const projects = await db.project.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(projects);
  } catch (e) {
    console.error("GET /api/admin/portfolio:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description = "", images = [], order = 0, active = true } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
  }

  try {
    const project = await db.project.create({
      data: { title: title.trim(), description, images, order: parseInt(order) || 0, active },
    });
    revalidatePortfolioPages();
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/portfolio:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
