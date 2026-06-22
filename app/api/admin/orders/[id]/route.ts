import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus)) {
      return NextResponse.json({ error: "Nieprawidłowy status płatności" }, { status: 400 });
    }
    const order = await db.order.update({
      where: { id },
      data: { paymentStatus: body.paymentStatus },
    });
    return NextResponse.json(order);
  }

  if (!Object.values(OrderStatus).includes(body.status)) {
    return NextResponse.json({ error: "Nieprawidłowy status" }, { status: 400 });
  }

  const updateData: { status: OrderStatus; paymentStatus?: string } = { status: body.status };

  if (body.status === OrderStatus.CANCELLED) {
    const existing = await db.order.findUnique({
      where: { id },
      select: { paymentStatus: true },
    });
    if (existing && existing.paymentStatus !== "PAID") {
      updateData.paymentStatus = "expired";
    }
  }

  const order = await db.order.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(order);
}
