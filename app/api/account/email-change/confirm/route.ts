// Potwierdzenie zmiany adresu e-mail.
//
// **Celowo nie wymaga sesji.** Klient bardzo często otwiera link z maila
// w innej przeglądarce albo na telefonie, gdzie nie jest zalogowany. Autoryzacją
// jest sam token – dlatego jest losowy, 32-bajtowy, trzymany w bazie wyłącznie
// jako hash i ważny godzinę.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { hashToken, isExpired, normalizeEmail } from "@/lib/email-change";

/** Powiadomienie starego adresu, że zmiana doszła do skutku. */
async function notifyOldAddress(oldEmail: string, newEmail: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Unique Ceramics <onboarding@resend.dev>",
      to: oldEmail,
      subject: "Adres e-mail Twojego konta został zmieniony",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#3d2b1f;">
          <p style="font-size:15px;line-height:1.6;">
            Adres e-mail Twojego konta w Unique Ceramics został zmieniony na
            <strong>${newEmail}</strong>. Od teraz logujesz się nowym adresem.
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b5748;">
            <strong>Jeśli to nie Ty</strong> – napisz do nas natychmiast,
            odpowiadając na tę wiadomość.
          </p>
        </div>
      `,
    });
  } catch (e) {
    // Zmiana już nastąpiła – brak powiadomienia jej nie cofa
    console.error("[email-change] powiadomienie o zmianie nieudane:", e);
  }
}

export async function POST(req: Request) {
  // Token jest nieodgadywalny, ale limit ucina próby zgadywania na ślepo
  if (await isRateLimited(`emailconfirm:${getClientIp(req)}`, 20, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Zbyt wiele prób. Spróbuj ponownie później." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const token = (body as { token?: unknown })?.token;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Brak tokenu potwierdzającego." }, { status: 400 });
  }

  const INVALID = "Link jest nieprawidłowy albo wygasł. Poproś o zmianę adresu ponownie.";

  let request;
  try {
    request = await db.emailChangeRequest.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, newEmail: true, expiresAt: true },
    });
  } catch (e) {
    console.error("[email-change] odczyt żądania nieudany:", e);
    return NextResponse.json(
      { error: "Nie udało się potwierdzić zmiany. Spróbuj ponownie." },
      { status: 500 }
    );
  }

  if (!request) return NextResponse.json({ error: INVALID }, { status: 400 });

  if (isExpired(request.expiresAt)) {
    // Sprzątamy – wygasłe żądanie nie ma po co leżeć w bazie
    await db.emailChangeRequest.delete({ where: { id: request.id } }).catch(() => {});
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: request.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    await db.emailChangeRequest.delete({ where: { id: request.id } }).catch(() => {});
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const newEmail = normalizeEmail(request.newEmail);
  const oldEmail = normalizeEmail(user.email);

  // Drugie sprawdzenie – między żądaniem a kliknięciem ktoś mógł zarejestrować
  // ten adres. Bez tego polegalibyśmy na wyjątku z unikalnego indeksu.
  const taken = await db.user.findFirst({
    where: { email: newEmail, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    await db.emailChangeRequest.delete({ where: { id: request.id } }).catch(() => {});
    return NextResponse.json(
      { error: "Ten adres został w międzyczasie zajęty przez inne konto." },
      { status: 409 }
    );
  }

  try {
    // Zmiana adresu i kasacja żądania w jednej transakcji – token jest
    // jednorazowy, więc nie może przetrwać nieudanej aktualizacji.
    // Bump `tokenVersion` unieważnia wszystkie sesje: e-mail jest loginem,
    // więc klient ma zalogować się nowym adresem (i traci sesję ktoś, kto
    // dokonałby zmiany bez jego wiedzy).
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { email: newEmail, tokenVersion: { increment: 1 } },
      }),
      db.emailChangeRequest.delete({ where: { id: request.id } }),
    ]);
  } catch (e) {
    console.error("[email-change] zapis nowego adresu nieudany:", e);
    return NextResponse.json(
      { error: "Nie udało się zapisać nowego adresu. Spróbuj ponownie." },
      { status: 500 }
    );
  }

  void notifyOldAddress(oldEmail, newEmail);

  return NextResponse.json({ success: true, email: newEmail });
}
