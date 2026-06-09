import { db } from "@/lib/db";
import { auth } from "@/auth";
import { validateAddress } from "@/lib/address-validation";
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

  const body = await req.json();

  // Whitelist pól — do bazy trafiają wyłącznie zwalidowane dane
  const address = {
    firstName: String(body.firstName ?? "").trim(),
    lastName:  String(body.lastName  ?? "").trim(),
    phone:     body.phone ? String(body.phone).trim() : "",
    street:    String(body.street    ?? "").trim(),
    postcode:  String(body.postcode  ?? "").trim(),
    city:      String(body.city      ?? "").trim(),
  };

  const validation = validateAddress(address);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, errors: validation.errors }, { status: 400 });
  }

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
    console.error("[account/address] save error:", e);
    return NextResponse.json({ ok: false, error: "Błąd zapisu adresu" }, { status: 500 });
  }
}
