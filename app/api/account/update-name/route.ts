import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Imię jest wymagane." }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: "Imię może mieć maksymalnie 100 znaków." }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user!.id },
    data: { name: name.trim() },
  });

  return NextResponse.json({ success: true });
}
