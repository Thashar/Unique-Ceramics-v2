import { db } from "@/lib/db";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (isRateLimited(getClientIp(req), 3, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań. Spróbuj za chwilę." }, { status: 429 });
  }
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      orderType,
      description,
      deadline,
      budget,
    } = await req.json();

    if (!customerName || !customerEmail || !orderType || !description) {
      return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
    }

    if (
      typeof customerEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      customerEmail.length > 254
    ) {
      return NextResponse.json({ error: "Nieprawidłowy adres e-mail" }, { status: 400 });
    }

    if (String(customerName).length > 100 || String(description).length > 5000) {
      return NextResponse.json({ error: "Treść formularza jest za długa" }, { status: 400 });
    }

    await db.customOrder.create({
      data: {
        customerName: String(customerName).trim().slice(0, 100),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 20) : null,
        orderType: String(orderType).slice(0, 50),
        description: String(description).trim().slice(0, 5000),
        deadline: deadline ? String(deadline).slice(0, 100) : null,
        budget: budget ? String(budget).slice(0, 100) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CustomOrder POST error:", error);
    return NextResponse.json({ error: "Wystąpił błąd. Spróbuj ponownie." }, { status: 500 });
  }
}
