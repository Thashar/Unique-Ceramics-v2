// Publiczna weryfikacja kodu rabatowego – formularz zamówienia pyta o nią,
// żeby od razu pokazać kwotę. **Kwoty i tak liczy jeszcze raz `/api/checkout`**,
// tutaj oddajemy sam procent i to, czy kod łączy się z innymi rabatami.

import { findActiveCode } from "@/lib/discount-codes";
import { normalizeCode } from "@/lib/discount-code";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Kod można zgadywać – limit chroni przed przemiataniem słownikiem
  if (await isRateLimited(`discount-code:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Zbyt wiele prób. Spróbuj ponownie za chwilę." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const raw = (body as { code?: unknown })?.code;
  const code = normalizeCode(raw);
  if (!code) return NextResponse.json({ error: "Wpisz kod rabatowy" }, { status: 400 });

  const active = await findActiveCode(code);
  if (!active) {
    // Nie zdradzamy, czy kod istnieje, ale wygasł – to i tak nic nie zmienia dla klienta
    return NextResponse.json({ error: "Kod jest nieprawidłowy lub wygasł" }, { status: 404 });
  }

  return NextResponse.json(active);
}
