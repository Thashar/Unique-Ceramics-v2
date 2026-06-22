import { NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (isRateLimited(getClientIp(request), 5, 60_000)) {
    return NextResponse.json({ error: "Zbyt wiele żądań. Spróbuj za chwilę." }, { status: 429 });
  }
  const { name, phone, email, subject, message, workshopType } = await request.json();

  if (!email || !message) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return NextResponse.json({ error: "Nieprawidłowy adres e-mail" }, { status: 400 });
  }

  if (String(message).length > 10_000 || String(subject ?? "").length > 200) {
    return NextResponse.json({ error: "Wiadomość jest za długa" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Brak konfiguracji email" }, { status: 500 });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const to = fromEmail.match(/<(.+)>/)?.[1] ?? "kontakt@uniqueceramics.pl";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: email,
      subject: `Kontakt: ${subject || "Wiadomość ze strony"}`,
      text: [
        `Imię: ${name || "—"}`,
        `Telefon: ${phone || "—"}`,
        `E-mail: ${email}`,
        `Temat: ${subject || "—"}`,
        ...(workshopType ? [`Rodzaj warsztatu: ${workshopType}`] : []),
        "",
        message,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Resend error:", err);
    return NextResponse.json({ error: "Błąd wysyłki" }, { status: 500 });
  }
}
