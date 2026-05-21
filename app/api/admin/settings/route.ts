import { db } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  const body: { key: string; value: string }[] = await req.json();

  await Promise.all(
    body.map(({ key, value }) =>
      db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const authError = await checkAdmin();
  if (authError) return authError;

  const body: { key: string; value: string }[] = await req.json();

  await Promise.all(
    body.map(({ key, value }) =>
      db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
