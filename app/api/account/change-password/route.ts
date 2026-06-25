import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ochrona przed brute-force obecnego hasła przy przejętej sesji
  if (await isRateLimited(`pwchange:${session.user.id}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele prób. Spróbuj za 15 minut." }, { status: 429 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    return NextResponse.json({ error: "Nowe hasło musi mieć od 8 do 128 znaków." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    return NextResponse.json({ error: "Konto Google nie obsługuje zmiany hasła tutaj." }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Aktualne hasło jest nieprawidłowe." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: user.id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
