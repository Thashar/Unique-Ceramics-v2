// Aktualne ceny produktów z koszyka.
//
// Koszyk żyje w localStorage i zapisuje cenę z chwili dodania produktu. Rabat
// produktowy ma własne okno czasu, więc po jego wygaśnięciu (albo po zmianie
// ceny w panelu) koszyk pokazywałby kwotę, której `/api/checkout` już nie
// policzy. Ten endpoint pozwala koszykowi i formularzowi zamówienia odświeżyć
// ceny **zanim** klient kliknie „Zamawiam”.
//
// Zwracamy dokładnie to, co liczy checkout: cenę po rabacie produktowym
// (`price`), cenę katalogową sprzed rabatu (`basePrice`) oraz stan magazynowy.

import { db } from "@/lib/db";
import { activeDiscountPercent, discountedPrice } from "@/lib/product-price";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/** Tyle pozycji ma sens w jednym koszyku – reszta to już próba obciążenia bazy. */
const MAX_IDS = 60;

export async function POST(req: Request) {
  if (await isRateLimited(`cart-prices:${getClientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const raw = (body as { productIds?: unknown })?.productIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }
  const ids = Array.from(
    new Set(raw.filter((id): id is string => typeof id === "string" && id.length > 0))
  ).slice(0, MAX_IDS);

  if (ids.length === 0) return NextResponse.json({ products: [] });

  try {
    const rows = await db.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        active: true,
        discountPercent: true,
        discountStartsAt: true,
        discountEndsAt: true,
      },
    });

    return NextResponse.json({
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        // Ta sama kwota, którą policzy /api/checkout – bez `holdMs`, bo tu nie
        // ma cache'u strony, a klient zaraz płaci
        price: discountedPrice(p.price, activeDiscountPercent(p)),
        basePrice: p.price,
        // Produkt wycofany ze sprzedaży zachowuje się w koszyku jak wyprzedany
        stock: p.active ? p.stock : 0,
      })),
    });
  } catch (e) {
    console.error("[cart/prices] odczyt cen nieudany:", e);
    return NextResponse.json({ error: "Nie udało się pobrać cen" }, { status: 500 });
  }
}
