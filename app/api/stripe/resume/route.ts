import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
  }

  const { orderId } = await req.json();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Nie znaleziono zamówienia" }, { status: 404 });
  }

  if (order.paymentMethod !== "stripe") {
    return NextResponse.json({ error: "To zamówienie nie wymaga płatności Stripe" }, { status: 400 });
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ error: "Zamówienie jest już opłacone" }, { status: 400 });
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
    cancel_url: `${baseUrl}/konto/zamowienia/${order.id}`,
  });

  return NextResponse.json({ url: stripeSession.url });
}
