import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (isRateLimited(getClientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań. Spróbuj za chwilę." }, { status: 429 });
  }
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Wszystkie pola są wymagane." }, { status: 400 });
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Nieprawidłowy adres e-mail." }, { status: 400 });
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Imię musi mieć od 2 do 100 znaków." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Hasło musi mieć co najmniej 8 znaków." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Konto z tym adresem e-mail już istnieje." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.create({
      data: { name, email, password: hashedPassword },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Błąd serwera. Spróbuj ponownie." }, { status: 500 });
  }
}
