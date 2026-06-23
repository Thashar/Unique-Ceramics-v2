import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { CustomOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const {
      status,
      adminNotes,
      price,
      paidAmount,
      customerName,
      customerEmail,
      customerPhone,
    } = await req.json();

    if (status !== undefined && !Object.values(CustomOrderStatus).includes(status)) {
      return NextResponse.json({ error: "Nieprawidłowy status" }, { status: 400 });
    }

    // Status PAID wymaga podanej kwoty wpłaconej
    if (status === "PAID") {
      const current = await db.customOrder.findUnique({ where: { id }, select: { paidAmount: true } });
      const resolvedPaidAmount = paidAmount !== undefined ? paidAmount : current?.paidAmount;
      if (!resolvedPaidAmount || Number(resolvedPaidAmount) <= 0) {
        return NextResponse.json(
          { error: "Status 'Opłacone' wymaga podania kwoty wpłaconej większej niż 0" },
          { status: 400 }
        );
      }
    }

    if (adminNotes !== undefined && typeof adminNotes !== "string") {
      return NextResponse.json({ error: "Nieprawidłowe notatki" }, { status: 400 });
    }

    if (customerEmail !== undefined) {
      if (
        typeof customerEmail !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
        customerEmail.length > 254
      ) {
        return NextResponse.json({ error: "Nieprawidłowy adres e-mail" }, { status: 400 });
      }
    }

    const order = await db.customOrder.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(adminNotes !== undefined && { adminNotes: adminNotes.slice(0, 5000) }),
        ...(price !== undefined && { price: price === null ? null : Math.round(Number(price) * 100) / 100 }),
        ...(paidAmount !== undefined && { paidAmount: paidAmount === null ? null : Math.round(Number(paidAmount) * 100) / 100 }),
        ...(customerName !== undefined && { customerName: String(customerName).trim().slice(0, 100) }),
        ...(customerEmail !== undefined && { customerEmail: String(customerEmail).trim() }),
        ...(customerPhone !== undefined && { customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 20) : null }),
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("CustomOrder PATCH error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
