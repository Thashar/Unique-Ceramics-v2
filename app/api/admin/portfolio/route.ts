import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { revalidatePortfolioPages } from "@/lib/portfolio";
import { validateProjectInput } from "@/lib/portfolio-validation";

export async function GET() {
  if (!await requireAdmin()) {
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
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const validation = validateProjectInput(await req.json());
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const project = await db.project.create({ data: validation.data });
    revalidatePortfolioPages();
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/portfolio:", e);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
