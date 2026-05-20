import { db } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json();

  const {
    firstName, lastName, email, phone,
    street, city, postcode, note,
    paymentMethod, items, shippingCost, total,
  } = body;

  if (!items?.length) {
    return NextResponse.json({ error: "Pusty koszyk" }, { status: 400 });
  }

  const order = await db.order.create({
    data: {
      userId: session?.user?.id ?? null,
      firstName,
      lastName,
      email,
      phone: phone || null,
      street,
      city,
      postcode,
      country: "PL",
      note: note || null,
      paymentMethod,
      shippingCost,
      total,
      items: {
        create: items.map((item: {
          productId: string;
          name: string;
          price: number;
          quantity: number;
        }) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
  });

  return NextResponse.json({ orderId: order.id });
}
