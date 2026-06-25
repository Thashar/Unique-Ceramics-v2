import { db } from "@/lib/db";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { NextResponse } from "next/server";

async function sendAdminNotification(params: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  orderType: string;
  description: string;
  deadline: string | null;
}) {
  try {
    const settings = await getSettings(["custom_order_notify_email_enabled", "contact_email"]);
    if (settings.custom_order_notify_email_enabled !== "true") return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const to = settings.contact_email || fromEmail.match(/<(.+)>/)?.[1] || "kontakt@uniqueceramics.pl";
    const baseUrl = process.env.AUTH_URL || "https://uniqueceramics.pl";

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Nowe zamówienie indywidualne — ${params.customerName}`,
      text: [
        `Nowe zamówienie indywidualne`,
        ``,
        `Klient: ${params.customerName}`,
        `E-mail: ${params.customerEmail}`,
        `Telefon: ${params.customerPhone || "—"}`,
        `Rodzaj: ${params.orderType}`,
        ...(params.deadline ? [`Termin: ${params.deadline}`] : []),
        ``,
        `Opis:`,
        params.description,
        ``,
        `Panel admina: ${baseUrl}/admin/zamowienia-indywidualne/${params.orderId}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[custom-order] Błąd wysyłki powiadomienia:", err);
  }
}

export async function POST(req: Request) {
  if (await isRateLimited(getClientIp(req), 3, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań. Spróbuj za chwilę." }, { status: 429 });
  }
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      orderType,
      description,
      deadline,
      budget,
    } = await req.json();

    if (!customerName || !customerEmail || !orderType || !description) {
      return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
    }

    if (
      typeof customerEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      customerEmail.length > 254
    ) {
      return NextResponse.json({ error: "Nieprawidłowy adres e-mail" }, { status: 400 });
    }

    if (String(customerName).length > 100 || String(description).length > 5000) {
      return NextResponse.json({ error: "Treść formularza jest za długa" }, { status: 400 });
    }

    const order = await db.customOrder.create({
      data: {
        customerName: String(customerName).trim().slice(0, 100),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 20) : null,
        orderType: String(orderType).slice(0, 50),
        description: String(description).trim().slice(0, 5000),
        deadline: deadline ? String(deadline).slice(0, 100) : null,
        budget: budget ? String(budget).slice(0, 100) : null,
      },
    });

    // Powiadomienie e-mail — nie blokuje odpowiedzi
    void sendAdminNotification({
      orderId: order.id,
      customerName: String(customerName).trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone ? String(customerPhone).trim() : null,
      orderType: String(orderType),
      description: String(description).trim(),
      deadline: deadline ? String(deadline) : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CustomOrder POST error:", error);
    return NextResponse.json({ error: "Wystąpił błąd. Spróbuj ponownie." }, { status: 500 });
  }
}
