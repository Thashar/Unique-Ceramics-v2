import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const PAYMENT_LABEL: Record<string, string> = {
  transfer: "Przelew bankowy",
  blik:     "BLIK",
  stripe:   "Karta (Stripe)",
};

async function sendAdminNotification(params: {
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  street: string;
  city: string;
  postcode: string;
  note: string | null;
  paymentMethod: string;
  items: { name: string; price: number; quantity: number }[];
  shippingCost: number;
  total: number;
  orderId: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const {
    orderNumber, firstName, lastName, email, phone,
    street, city, postcode, note, paymentMethod,
    items, shippingCost, total, orderId,
  } = params;

  const rows = items
    .map((i) => `${i.name} ×${i.quantity} — ${(i.price * i.quantity).toFixed(2)} zł`)
    .join("\n");

  const adminEmail = process.env.RESEND_FROM_EMAIL?.match(/<(.+)>/)?.[1]
    ?? "kontakt@uniqueceramics.pl";

  const baseUrl = process.env.AUTH_URL ?? "https://uniqueceramics.pl";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Unique Ceramics <onboarding@resend.dev>",
      to: adminEmail,
      subject: `🛒 Nowe zamówienie #${orderNumber} — ${firstName} ${lastName} — ${total.toFixed(2)} zł`,
      text: [
        `Nowe zamówienie #${orderNumber}`,
        ``,
        `Klient: ${firstName} ${lastName}`,
        `E-mail: ${email}`,
        `Telefon: ${phone || "—"}`,
        `Adres: ${street}, ${postcode} ${city}`,
        ``,
        `Płatność: ${PAYMENT_LABEL[paymentMethod] ?? paymentMethod}`,
        ``,
        `Zamówione produkty:`,
        rows,
        ``,
        `Wysyłka: ${shippingCost === 0 ? "Gratis" : `${shippingCost.toFixed(2)} zł`}`,
        `Do zapłaty: ${total.toFixed(2)} zł`,
        note ? `\nUwagi klienta: ${note}` : "",
        ``,
        `Panel admina: ${baseUrl}/admin/zamowienia/${orderId}`,
      ].join("\n"),
    });
  } catch {
    // Nie blokuj zamówienia jeśli email nie dotarł
  }
}

function buildTransferEmail(params: {
  orderNumber: string;
  firstName: string;
  email: string;
  items: { name: string; price: number; quantity: number }[];
  shippingCost: number;
  total: number;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  transferTitle: string;
}): string {
  const {
    orderNumber,
    firstName,
    items,
    shippingCost,
    total,
    bankAccountName,
    bankAccountNumber,
    bankName,
    transferTitle,
  } = params;

  const itemsHtml = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d6;">${i.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d6;text-align:center;">×${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e0d6;text-align:right;">${(i.price * i.quantity).toFixed(2).replace(".", ",")} zł</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;">
    <div style="background:#3d2b1f;padding:32px 40px;">
      <p style="color:#c8a882;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px;">Unique Ceramics</p>
      <h1 style="color:#f5f0eb;font-size:24px;margin:0;font-weight:normal;">Dziękuję za zamówienie!</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#4a3728;font-size:15px;margin:0 0 24px;">Cześć ${firstName},</p>
      <p style="color:#6b5748;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Twoje zamówienie <strong style="color:#3d2b1f;">#${orderNumber}</strong> zostało przyjęte.
        Aby je zrealizować, prosimy o dokonanie przelewu na poniższe dane:
      </p>

      <div style="background:#f5f0eb;border-left:3px solid #c87941;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;color:#9a7a6a;letter-spacing:0.15em;text-transform:uppercase;">Dane do przelewu</p>
        ${bankAccountName ? `<p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Odbiorca:</strong> ${bankAccountName}</p>` : ""}
        ${bankAccountNumber ? `<p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Numer konta:</strong> <span style="font-family:monospace;">${bankAccountNumber}</span></p>` : ""}
        ${bankName ? `<p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Bank:</strong> ${bankName}</p>` : ""}
        <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Kwota:</strong> ${total.toFixed(2).replace(".", ",")} zł</p>
        <p style="margin:4px 0;font-size:14px;color:#3d2b1f;"><strong>Tytuł:</strong> ${transferTitle} #${orderNumber}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;font-size:14px;color:#4a3728;">
        <thead>
          <tr style="background:#f5f0eb;">
            <th style="padding:8px 12px;text-align:left;font-weight:normal;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9a7a6a;">Produkt</th>
            <th style="padding:8px 12px;text-align:center;font-weight:normal;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9a7a6a;">Ilość</th>
            <th style="padding:8px 12px;text-align:right;font-weight:normal;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9a7a6a;">Cena</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <table style="width:100%;font-size:14px;color:#4a3728;">
        <tr>
          <td style="padding:6px 12px;text-align:right;color:#9a7a6a;">Wysyłka</td>
          <td style="padding:6px 12px;text-align:right;width:120px;">${shippingCost === 0 ? "Gratis" : `${shippingCost.toFixed(2).replace(".", ",")} zł`}</td>
        </tr>
        <tr style="border-top:2px solid #e8e0d6;">
          <td style="padding:10px 12px;text-align:right;font-size:16px;color:#3d2b1f;">Razem</td>
          <td style="padding:10px 12px;text-align:right;font-size:16px;color:#3d2b1f;font-weight:bold;">${total.toFixed(2).replace(".", ",")} zł</td>
        </tr>
      </table>

      <p style="color:#9a7a6a;font-size:13px;margin:28px 0 0;line-height:1.6;">
        Po zaksięgowaniu płatności wyślę potwierdzenie i zajmę się realizacją zamówienia.
        Płatność powinna zostać zrealizowana w ciągu <strong>7 dni</strong>.
      </p>
    </div>
    <div style="background:#f5f0eb;padding:20px 40px;text-align:center;">
      <p style="color:#9a7a6a;font-size:12px;margin:0;">© ${new Date().getFullYear()} Unique Ceramics · ręcznie tworzone z sercem</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json();

  const {
    firstName,
    lastName,
    email,
    phone,
    street,
    city,
    postcode,
    note,
    paymentMethod,
    items,
    shippingCost,
    total,
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
        create: items.map(
          (item: {
            productId: string;
            name: string;
            price: number;
            quantity: number;
          }) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })
        ),
      },
    },
  });

  // Powiadomienie dla właściciela sklepu
  const orderNumber = order.id.slice(-8).toUpperCase();
  void sendAdminNotification({
    orderNumber, firstName, lastName, email, phone: phone || null,
    street, city, postcode, note: note || null, paymentMethod,
    items, shippingCost, total, orderId: order.id,
  });

  // Stripe — create Checkout session and redirect
  if (paymentMethod === "stripe") {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe nie jest skonfigurowany" }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        ...items.map((item: { name: string; price: number; quantity: number }) => ({
          price_data: {
            currency: "pln",
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        ...(shippingCost > 0
          ? [{
              price_data: {
                currency: "pln",
                product_data: { name: "Wysyłka" },
                unit_amount: Math.round(shippingCost * 100),
              },
              quantity: 1,
            }]
          : []),
      ],
      metadata: { orderId: order.id },
      success_url: `${baseUrl}/zamowienie/potwierdzenie?id=${order.id}`,
      cancel_url: `${baseUrl}/zamowienie`,
    });

    return NextResponse.json({ orderId: order.id, stripeUrl: session.url });
  }

  // Send confirmation email for bank transfer orders
  if (paymentMethod === "transfer") {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const bankSettings = await getSettings([
          "payment_bank_account_name",
          "payment_bank_account_number",
          "payment_bank_name",
          "payment_bank_transfer_title",
        ]);

        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ??
            "Unique Ceramics <onboarding@resend.dev>",
          to: email,
          subject: `Zamówienie #${orderNumber} — dane do przelewu`,
          html: buildTransferEmail({
            orderNumber,
            firstName,
            email,
            items,
            shippingCost,
            total,
            bankAccountName: bankSettings.payment_bank_account_name,
            bankAccountNumber: bankSettings.payment_bank_account_number,
            bankName: bankSettings.payment_bank_name,
            transferTitle:
              bankSettings.payment_bank_transfer_title || "Zamówienie",
          }),
        });
      } catch {
        // Email failure doesn't block the order
      }
    }
  }

  return NextResponse.json({ orderId: order.id });
}
