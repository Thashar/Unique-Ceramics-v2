import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";

// Usunięcie konta — prawo do bycia zapomnianym (RODO art. 17).
// Zamówienia NIE są kasowane, lecz odłączane od konta (Order.userId → null
// przez onDelete: SetNull) — dane do faktur podlegają obowiązkowi retencji
// (przepisy podatkowe), więc retencja ma odrębną podstawę prawną.
// Kaskadowo usuwane są sesje i powiązania OAuth (onDelete: Cascade) oraz
// zapisany adres dostawy (Setting `user_address_{id}`).
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Ochrona przed nadużyciem przy przejętej sesji
  if (await isRateLimited(`account-delete:${userId}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele prób. Spróbuj za 15 minut." }, { status: 429 });
  }

  let currentPassword: unknown;
  try {
    ({ currentPassword } = await req.json());
  } catch {
    currentPassword = undefined;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
  }

  // Konto z hasłem (Credentials) — wymagaj ponownego uwierzytelnienia.
  // Konto OAuth (bez hasła) — wystarcza aktywna sesja.
  if (user.password) {
    if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 400 });
    }
  }

  try {
    await db.$transaction([
      db.setting.deleteMany({ where: { key: `user_address_${userId}` } }),
      db.user.delete({ where: { id: userId } }),
    ]);
  } catch (e) {
    console.error("[account/delete] error:", e);
    return NextResponse.json({ error: "Nie udało się usunąć konta." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
