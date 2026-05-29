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

    await db.customOrder.create({
      data: {
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        orderType,
        description,
        deadline: deadline || null,
        budget: budget || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CustomOrder POST error:", error);
    return NextResponse.json({ error: "Wystąpił błąd. Spróbuj ponownie." }, { status: 500 });
  }
}
