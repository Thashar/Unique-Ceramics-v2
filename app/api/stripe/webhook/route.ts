import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { revalidateProductPages } from "@/lib/products";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe nie jest skonfigurowany" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Brak podpisu" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy podpis" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    // completed nie zawsze oznacza opłacone (asynchroniczne metody płatności)
    if (orderId && session.payment_status === "paid") {
      // Ustaw paidAt tylko przy pierwszym opłaceniu — przychód rozpoznawany wg tej daty
      await db.order.updateMany({
        where: { id: orderId, paymentStatus: { not: "PAID" } },
        data: { paymentStatus: "PAID", paidAt: new Date() },
      });
    }
  }

  // Porzucona płatność — sesja Stripe wygasa po 24h. Anuluj zamówienie
  // i zwróć zarezerwowany stan magazynowy (raz — updateMany jest idempotentne).
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const cancelled = await db.order.updateMany({
        where: { id: orderId, paymentMethod: "stripe", paymentStatus: { not: "PAID" }, status: "PENDING" },
        data: { status: "CANCELLED", paymentStatus: "expired" },
      });
      if (cancelled.count === 1) {
        const items = await db.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          await db.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }).catch(() => {
            // Produkt mógł zostać usunięty — nie blokuj webhooka
          });
        }
        revalidateProductPages();
      }
    }
  }

  return NextResponse.json({ received: true });
}
