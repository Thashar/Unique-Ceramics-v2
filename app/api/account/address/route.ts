import { db } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ address: null });
  }

  try {
    const key = `user_address_${session.user.id}`;
    const row = await db.setting.findUnique({ where: { key } });
    if (row) {
      return NextResponse.json({ address: JSON.parse(row.value) });
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
    const key = `user_address_${session.user.id}`;
    const value = JSON.stringify(address);
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
