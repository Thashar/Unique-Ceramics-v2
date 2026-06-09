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
    const { status, adminNotes } = await req.json();

    if (status !== undefined && !Object.values(CustomOrderStatus).includes(status)) {
      return NextResponse.json({ error: "Nieprawidłowy status" }, { status: 400 });
    }
    if (adminNotes !== undefined && typeof adminNotes !== "string") {
      return NextResponse.json({ error: "Nieprawidłowe notatki" }, { status: 400 });
    }

    const order = await db.customOrder.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(adminNotes !== undefined && { adminNotes: adminNotes.slice(0, 5000) }),
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("CustomOrder PATCH error:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}
