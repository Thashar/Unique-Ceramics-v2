// Koszyk przypisany do konta klienta.
//
// Koszyk gościa żyje w localStorage. Po zalogowaniu scalamy go z tym zapisanym
// na koncie, żeby klient znalazł swoje produkty także na innym urządzeniu –
// i żeby nie przepadły, gdy zaloguje się w trakcie zakupów.
//
// Przechowywanie: tabela `Setting`, klucz `user_cart_{userId}` – ten sam wzorzec
// co adres dostawy (`user_address_{userId}`), więc nie wymaga migracji.
//
// **Zapisujemy wyłącznie identyfikatory i ilości w formie znormalizowanej.**
// Ceny i stany magazynowe z tego zapisu nigdy nie są traktowane jako prawda –
// przy odczycie wyrównuje je `/api/cart/prices`, a kwotę i tak liczy
// `/api/checkout` z bazy.

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** Tyle pozycji ma sens w jednym koszyku – reszta to już próba obciążenia bazy. */
const MAX_ITEMS = 60;

type StoredItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  basePrice?: number;
  image: string;
  quantity: number;
  stock: number;
};

function normalize(raw: unknown): StoredItem[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredItem[] = [];
  for (const entry of raw.slice(0, MAX_ITEMS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const i = entry as Record<string, unknown>;
    const id = String(i.id ?? "").trim();
    if (!id) continue;
    const quantity = Math.trunc(Number(i.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    const basePrice = Number(i.basePrice);
    out.push({
      id,
      slug: String(i.slug ?? "").slice(0, 200),
      name: String(i.name ?? "").slice(0, 300),
      price: Number.isFinite(Number(i.price)) ? Number(i.price) : 0,
      ...(Number.isFinite(basePrice) && basePrice > 0 ? { basePrice } : {}),
      image: String(i.image ?? "").slice(0, 500),
      quantity: Math.min(quantity, 999),
      stock: Number.isFinite(Number(i.stock)) ? Number(i.stock) : 0,
    });
  }
  return out;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  try {
    const row = await db.setting.findUnique({
      where: { key: `user_cart_${session.user.id}` },
    });
    return NextResponse.json({ items: row ? normalize(JSON.parse(row.value)) : [] });
  } catch (e) {
    console.error("[account/cart] odczyt koszyka nieudany:", e);
    // Pusta lista, nie błąd – koszyk z urządzenia zostaje nietknięty
    return NextResponse.json({ items: [] });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const items = normalize((body as { items?: unknown })?.items);
  const key = `user_cart_${session.user.id}`;
  const value = JSON.stringify(items);

  try {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("[account/cart] zapis koszyka nieudany:", e);
    return NextResponse.json({ error: "Nie udało się zapisać koszyka" }, { status: 500 });
  }
}
