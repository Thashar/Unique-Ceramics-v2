import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Trasa jest dostępna bez sesji (zamówienia gości), więc limitujemy po IP
  if (await isRateLimited(`stripe-resume:${getClientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań. Spróbuj za chwilę." }, { status: 429 });
  }

  const session = await auth();

  let orderId: unknown;
  try {
    ({ orderId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane żądania" }, { status: 400 });
  }
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "Nie znaleziono zamówienia" }, { status: 404 });
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  // Zamówienie z konta – tylko właściciel. Zamówienie gościa – identyfikator
  // zamówienia pełni rolę tokenu dostępu (tak samo jak na stronie potwierdzenia);
  // wznowienie i tak prowadzi wyłącznie do zapłaty za to zamówienie.
  const allowed = order
    ? (order.userId ? order.userId === session?.user?.id : true)
    : false;

  if (!order || !allowed) {
    return NextResponse.json({ error: "Nie znaleziono zamówienia" }, { status: 404 });
  }

  if (order.paymentMethod !== "stripe") {
    return NextResponse.json({ error: "To zamówienie nie wymaga płatności Stripe" }, { status: 400 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Zamówienie jest już opłacone" }, { status: 400 });
  }

  // Zamówienie anulowane (np. wygasła sesja Stripe) – stan magazynowy został
  // już zwrócony, wznowienie płatności mogłoby sprzedać niedostępny towar
  if (order.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Zamówienie zostało anulowane. Złóż je ponownie." },
      { status: 400 }
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe nie jest skonfigurowany" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      ...order.items.map((item) => ({
        price_data: {
          currency: "pln",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      ...(order.shippingCost > 0
        ? [{
            price_data: {
              currency: "pln",
              product_data: { name: "Wysyłka" },
              unit_amount: Math.round(order.shippingCost * 100),
            },
            quantity: 1,
          }]
        : []),
    ],
    metadata: { orderId: order.id },
    success_url: `${baseUrl}/zamowienie/potwierdzenie?id=${order.id}`,
    // Gość nie ma panelu konta – wraca na stronę potwierdzenia z tym samym linkiem
    cancel_url: order.userId
      ? `${baseUrl}/konto/zamowienia/${order.id}`
      : `${baseUrl}/zamowienie/potwierdzenie?id=${order.id}&platnosc=anulowana`,
  });

  return NextResponse.json({ url: stripeSession.url });
}
