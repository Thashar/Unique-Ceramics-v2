import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { name, phone, email, subject, message } = await request.json();

  if (!email || !message) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const to = process.env.RESEND_FROM_EMAIL
    ? process.env.RESEND_FROM_EMAIL.match(/<(.+)>/)?.[1] ?? "kontakt@uniqueceramics.pl"
    : "kontakt@uniqueceramics.pl";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
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
  } catch {
    return NextResponse.json({ error: "Błąd wysyłki" }, { status: 500 });
  }
}
