import { requireAdmin } from "@/lib/admin-auth";
import { getSetting } from "@/lib/settings";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key } = await params;
  const value = await getSetting(key);

  return NextResponse.json({ value });
}
