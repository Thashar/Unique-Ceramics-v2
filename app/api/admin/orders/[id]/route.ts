import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const PAYMENT_STATUSES = ["PENDING", "PAID"];
const SHIPPED_STATUSES = [OrderStatus.SHIPPED, OrderStatus.DELIVERED];

const CARRIER_LABELS: Record<string, string> = {
  dpd:    "DPD",
  dhl:    "DHL",
  inpost: "InPost",
  poczta: "Poczta Polska",
};

function carrierTrackUrl(carrier: string, number: string): string {
  switch (carrier) {
    case "dpd":    return `https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=${number}`;
    case "dhl":    return `https://www.dhl.com/pl-pl/home/tracking/tracking-express.html?submit=1&tracking-id=${number}`;
    case "inpost": return `https://inpost.pl/sledzenie-przesylek?number=${number}`;
    case "poczta": return `https://emonitoring.poczta-polska.pl/?numer=${number}`;
    default:       return "";
  }
}

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
      <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#f5f0e8;letter-spacing:0.2em;text-transform:uppercase;opacity:0.55;">Ręcznie tworzone z sercem</p>
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

async function sendCancellationEmail(order: {
  id: string;
  email: string;
  firstName: string;
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
      subject: `Zamówienie #${orderNumber} — anulowane`,
      html: `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#faf8f5;">
    <div style="background:#2c2825;padding:28px 40px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#f5f0e8;letter-spacing:0.1em;">Unique Ceramics</p>
      <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#f5f0e8;letter-spacing:0.2em;text-transform:uppercase;opacity:0.55;">Ręcznie tworzone z sercem</p>
    </div>

    <div style="padding:32px 40px;">
      <p style="color:#4a3728;font-size:15px;margin:0 0 24px;">Cześć ${order.firstName},</p>

      <div style="background:#fff5f5;border-left:3px solid #ef4444;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#b91c1c;letter-spacing:0.15em;text-transform:uppercase;">Zamówienie anulowane</p>
        <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.5;">
          Zamówienie <strong>#${orderNumber}</strong> zostało anulowane.
        </p>
      </div>

      <p style="color:#6b5748;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Jeśli to pomyłka lub masz pytania, odpowiedz na tę wiadomość — chętnie pomogę.
        Zapraszam do ponownych zakupów w sklepie.
      </p>

      <p style="color:#9a8a80;font-size:12px;line-height:1.6;margin:0;">
        Jeśli dokonałaś/eś płatności, a zamówienie zostało anulowane przez pomyłkę — skontaktuj się ze mną niezwłocznie.
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
    console.error("[orders/patch] Błąd wysyłki powiadomienia o anulowaniu:", err);
  }
}

async function sendShippedEmail(order: {
  id: string;
  email: string;
  firstName: string;
  trackingNumber: string;
  trackingCarrier: string;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const orderNumber = order.id.slice(-8).toUpperCase();
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const carrierLabel = CARRIER_LABELS[order.trackingCarrier] ?? order.trackingCarrier;
    const trackUrl = carrierTrackUrl(order.trackingCarrier, order.trackingNumber);

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to: order.email,
      subject: `Zamówienie #${orderNumber} — przesyłka wysłana!`,
      html: `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#faf8f5;">
    <div style="background:#2c2825;padding:28px 40px;text-align:center;">
      <p style="margin:0;font-family:Georgia,serif;font-size:18px;color:#f5f0e8;letter-spacing:0.1em;">Unique Ceramics</p>
      <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#f5f0e8;letter-spacing:0.2em;text-transform:uppercase;opacity:0.55;">Ręcznie tworzone z sercem</p>
    </div>

    <div style="padding:32px 40px;">
      <p style="color:#4a3728;font-size:15px;margin:0 0 24px;">Cześć ${order.firstName},</p>

      <div style="background:#f0f9ff;border-left:3px solid #0284c7;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#0369a1;letter-spacing:0.15em;text-transform:uppercase;">Przesyłka w drodze</p>
        <p style="margin:0;font-size:14px;color:#075985;line-height:1.5;">
          Twoje zamówienie <strong>#${orderNumber}</strong> zostało nadane i jest w drodze do Ciebie!
        </p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:14px;color:#4a3728;border:1px solid #e8dfd0;">
        <tr style="background:#f5f0e8;">
          <td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b7355;">Dostawca</td>
          <td style="padding:10px 16px;text-align:right;font-weight:bold;">${carrierLabel}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b7355;">Numer listu</td>
          <td style="padding:10px 16px;text-align:right;font-family:monospace;">${order.trackingNumber}</td>
        </tr>
      </table>

      ${trackUrl ? `
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${trackUrl}" target="_blank" style="display:inline-block;background:#c4a882;color:#2c2825;text-decoration:none;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;padding:14px 28px;">
          Śledź przesyłkę →
        </a>
      </div>` : ""}

      <p style="color:#9a8a80;font-size:12px;line-height:1.6;margin:0;">
        Jeśli masz pytania dotyczące przesyłki, odpiszę na tę wiadomość lub skontaktuj się z kurierem podając numer listu.
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
    console.error("[orders/patch] Błąd wysyłki powiadomienia o wysyłce:", err);
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

  // Zapis danych listu przewozowego
  if (body.trackingNumber !== undefined || body.trackingCarrier !== undefined) {
    const updateData: { trackingNumber?: string; trackingCarrier?: string } = {};
    if (body.trackingNumber !== undefined) updateData.trackingNumber = String(body.trackingNumber).trim();
    if (body.trackingCarrier !== undefined) updateData.trackingCarrier = String(body.trackingCarrier).trim();

    const order = await db.order.update({ where: { id }, data: updateData });
    return NextResponse.json(order);
  }

  // Zmiana statusu płatności
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

  // Zmiana statusu zamówienia
  if (!Object.values(OrderStatus).includes(body.status)) {
    return NextResponse.json({ error: "Nieprawidłowy status" }, { status: 400 });
  }

  // Blokada SHIPPED/DELIVERED bez danych listu przewozowego (tylko kurier/paczkomat)
  if (SHIPPED_STATUSES.includes(body.status)) {
    const existing = await db.order.findUnique({
      where: { id },
      select: { shippingMethod: true, trackingNumber: true, trackingCarrier: true },
    });
    if (existing && existing.shippingMethod !== "pickup") {
      if (!existing.trackingNumber || !existing.trackingCarrier) {
        return NextResponse.json(
          { error: "Uzupełnij numer listu przewozowego i dostawcę przed zmianą statusu na wysłane." },
          { status: 400 }
        );
      }
    }
  }

  let cancelledOrderForEmail: { id: string; email: string; firstName: string } | null = null;

  let order: {
    id: string; status: OrderStatus; paymentStatus: string;
    email: string; firstName: string;
    trackingNumber: string | null; trackingCarrier: string | null; shippingMethod: string;
  };

  if (body.status === OrderStatus.CANCELLED) {
    const existing = await db.order.findUnique({
      where: { id },
      select: { paymentStatus: true, email: true, firstName: true, status: true, items: { select: { productId: true, quantity: true } } },
    });

    const updateData: { status: OrderStatus; paymentStatus?: string } = { status: body.status };
    if (existing && existing.paymentStatus !== "PAID") {
      updateData.paymentStatus = "expired";
    }

    order = await db.$transaction(async (tx) => {
      // Zwróć stany magazynowe
      if (existing && existing.status !== OrderStatus.CANCELLED) {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return tx.order.update({
        where: { id },
        data: updateData,
        select: {
          id: true, status: true, paymentStatus: true,
          email: true, firstName: true,
          trackingNumber: true, trackingCarrier: true, shippingMethod: true,
        },
      });
    });

    if (existing) {
      cancelledOrderForEmail = { id, email: existing.email, firstName: existing.firstName };
    }
  } else {
    order = await db.order.update({
      where: { id },
      data: { status: body.status },
      select: {
        id: true, status: true, paymentStatus: true,
        email: true, firstName: true,
        trackingNumber: true, trackingCarrier: true, shippingMethod: true,
      },
    });
  }

  // Mail o anulowaniu
  if (cancelledOrderForEmail) {
    void sendCancellationEmail(cancelledOrderForEmail);
  }

  // Mail o wysyłce — gdy status zmieniony na SHIPPED i są dane listu
  if (
    body.status === OrderStatus.SHIPPED &&
    order.shippingMethod !== "pickup" &&
    order.trackingNumber &&
    order.trackingCarrier
  ) {
    void sendShippedEmail({
      id: order.id,
      email: order.email,
      firstName: order.firstName,
      trackingNumber: order.trackingNumber,
      trackingCarrier: order.trackingCarrier,
    });
  }

  return NextResponse.json(order);
}
