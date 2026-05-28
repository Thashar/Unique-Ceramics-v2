import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { name, phone, email, subject, message } = await request.json();

  if (!email || !message) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
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
