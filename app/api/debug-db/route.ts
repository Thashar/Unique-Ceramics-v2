import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "(brak)";
  const masked = url.replace(/:([^:@]+)@/, ":***@");

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, url: masked });
  } catch (e) {
    return NextResponse.json({ ok: false, url: masked, error: String(e) }, { status: 500 });
  }
}
