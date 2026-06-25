import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";

// Eksport danych osobowych konta — prawo dostępu (RODO art. 15) i przenoszenia
// (art. 20). Zwraca komplet danych powiązanych z kontem jako plik JSON.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  if (await isRateLimited(`account-export:${userId}`, 5, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań. Spróbuj za chwilę." }, { status: 429 });
  }

  const [user, addressRow, orders] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
    }),
    db.setting.findUnique({ where: { key: `user_address_${userId}` } }),
    db.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
  }

  const data = {
    exportedAt: new Date().toISOString(),
    account: user,
    savedAddress: addressRow ? JSON.parse(addressRow.value) : null,
    orders,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="moje-dane-${userId.slice(-8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
