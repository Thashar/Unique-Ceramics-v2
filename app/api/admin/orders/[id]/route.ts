import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const PAYMENT_STATUSES = ["PENDING", "PAID"];

async function sendPaymentConfirmationEmail(order: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  total: number;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const orderNumber = order.id.slice(-8).toUpperCase();
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to: order.email,
      subject: `Zamówienie #${orderNumber} — płatność potwierdzona`,
      html: `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#faf8f5;">
    <div style="background:#2c2825;padding:28px 40px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#f5f0e8;letter-spacing:0.1em;">Unique Ceramics</p>
      <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#f5f0e8/60;letter-spacing:0.2em;text-transform:uppercase;opacity:0.55;">Ręcznie tworzone z sercem</p>
    </div>

    <div style="padding:32px 40px;">
      <p style="color:#4a3728;font-size:15px;margin:0 0 24px;">Cześć ${order.firstName},</p>

      <div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#15803d;letter-spacing:0.15em;text-transform:uppercase;">Płatność potwierdzona</p>
        <p style="margin:0;font-size:14px;color:#166534;line-height:1.5;">
          Twoja płatność za zamówienie <strong>#${orderNumber}</strong> została potwierdzona. Dziękujemy!
        </p>
      </div>

      <p style="color:#6b5748;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Niebawem przystąpię do realizacji Twojego zamówienia. O każdej zmianie statusu będziesz informowany/a na bieżąco.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;color:#4a3728;border:1px solid #e8dfd0;">
        <tr style="background:#f5f0e8;">
          <td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b7355;">Numer zamówienia</td>
          <td style="padding:10px 16px;text-align:right;font-family:monospace;font-weight:bold;">#${orderNumber}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b7355;">Kwota</td>
          <td style="padding:10px 16px;text-align:right;font-weight:bold;">${order.total.toFixed(2).replace(".", ",")} zł</td>
        </tr>
      </table>

      <p style="color:#9a8a80;font-size:12px;line-height:1.6;margin:0;">
        W razie pytań odpiszę na tę wiadomość lub skontaktuj się przez formularz kontaktowy.
      </p>
    </div>

    <div style="background:#f5f0e8;padding:20px 40px;text-align:center;border-top:1px solid #e8dfd0;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#9a8a80;">
        © Unique Ceramics · kontakt@uniqueceramics.pl
      </p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[orders/patch] Błąd wysyłki potwierdzenia płatności:", err);
  }
}

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

    const existing = await db.order.findUnique({
      where: { id },
      select: { paymentStatus: true, email: true, firstName: true, lastName: true, total: true },
    });

    const order = await db.order.update({
      where: { id },
      data: { paymentStatus: body.paymentStatus },
    });

    if (body.paymentStatus === "PAID" && existing?.paymentStatus !== "PAID") {
      void sendPaymentConfirmationEmail({
        id: order.id,
        email: order.email,
        firstName: order.firstName,
        lastName: order.lastName,
        total: order.total,
      });
    }

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
