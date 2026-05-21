import { db } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

async function ensureSettingTable() {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Setting" (
      key TEXT NOT NULL PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ address: null });
  }

  try {
    await ensureSettingTable();
    const key = `user_address_${session.user.id}`;
    const rows = await db.$queryRaw<{ value: string }[]>`
      SELECT value FROM "Setting" WHERE key = ${key}
    `;
    if (rows.length > 0) {
      return NextResponse.json({ address: JSON.parse(rows[0].value) });
    }
    return NextResponse.json({ address: null });
  } catch {
    return NextResponse.json({ address: null });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const address = await req.json();

  try {
    await ensureSettingTable();
    const key = `user_address_${session.user.id}`;
    const value = JSON.stringify(address);
    await db.$executeRaw`
      INSERT INTO "Setting" (key, value, "updatedAt")
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, "updatedAt" = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
