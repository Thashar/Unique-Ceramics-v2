// Żądanie zmiany adresu e-mail konta.
//
// E-mail jest w tym sklepie **loginem**, więc podmiana wymaga dwóch dowodów:
//   1. znajomości aktualnego hasła (chroni przed przejętą sesją),
//   2. dostępu do **nowej** skrzynki – potwierdzenie linkiem wysłanym właśnie tam.
//
// Tutaj powstaje dopiero żądanie. Adres zmienia się dopiero po kliknięciu linku
// (patrz `email-change/confirm`).

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import {
  checkNewEmail,
  createToken,
  expiryFrom,
  hashToken,
  normalizeEmail,
} from "@/lib/email-change";

const APP_URL = process.env.AUTH_URL ?? "https://uniqueceramics.pl";

/** Wysyłka obu wiadomości. Zwraca false, gdy nie udało się wysłać potwierdzenia. */
async function sendEmails(params: {
  newEmail: string;
  oldEmail: string;
  token: string;
  name: string | null;
}): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("[email-change] brak RESEND_API_KEY – nie ma jak wysłać potwierdzenia");
    return false;
  }

  const { newEmail, oldEmail, token, name } = params;
  // Strona potwierdzenia jest **poza `/konto`** – tamta sekcja wymaga sesji,
  // a link z maila klient często otwiera na innym urządzeniu
  const link = `${APP_URL}/zmiana-emaila?token=${token}`;
  const hello = name ? `Cześć ${name.split(" ")[0]},` : "Cześć,";
  const from = process.env.RESEND_FROM_EMAIL ?? "Unique Ceramics <onboarding@resend.dev>";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    // 1. Na NOWY adres – link potwierdzający. Ten musi dojść, inaczej zmiany
    //    nie da się dokończyć, więc jego błąd przerywa całą operację.
    await resend.emails.send({
      from,
      to: newEmail,
      subject: "Potwierdź nowy adres e-mail – Unique Ceramics",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#3d2b1f;">
          <p style="font-size:15px;line-height:1.6;">${hello}</p>
          <p style="font-size:15px;line-height:1.6;">
            Poproszono o zmianę adresu e-mail konta w sklepie Unique Ceramics na
            <strong>${newEmail}</strong>. Potwierdź to kliknięciem:
          </p>
          <p style="margin:28px 0;">
            <a href="${link}" style="background:#755F44;color:#FAF8F5;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;display:inline-block;">
              Potwierdź nowy adres
            </a>
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b5748;">
            Link jest ważny <strong>1 godzinę</strong>. Po potwierdzeniu będziesz logować się
            tym adresem, a wszystkie urządzenia zostaną wylogowane.
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b5748;">
            Jeśli to nie Ty prosiłeś o zmianę – zignoruj tę wiadomość, nic się nie stanie.
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("[email-change] wysyłka potwierdzenia nieudana:", e);
    return false;
  }

  // 2. Na STARY adres – ostrzeżenie. Klient musi wiedzieć, że ktoś próbuje
  //    przejąć jego login, nawet jeśli sam o to nie prosił. Błąd tej wiadomości
  //    nie przerywa operacji – potwierdzenie już poszło.
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from,
      to: oldEmail,
      subject: "Poproszono o zmianę adresu e-mail Twojego konta",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#3d2b1f;">
          <p style="font-size:15px;line-height:1.6;">${hello}</p>
          <p style="font-size:15px;line-height:1.6;">
            Ktoś poprosił o zmianę adresu e-mail Twojego konta w Unique Ceramics na
            <strong>${newEmail}</strong>. Zmiana nastąpi dopiero po potwierdzeniu
            z tamtej skrzynki.
          </p>
          <p style="font-size:13px;line-height:1.6;color:#6b5748;">
            <strong>Jeśli to nie Ty</strong> – zmień hasło do konta jak najszybciej
            i napisz do nas. Dopóki nie klikniesz niczego w tamtej wiadomości,
            adres pozostaje bez zmian.
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("[email-change] ostrzeżenie na stary adres nieudane:", e);
  }

  return true;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ta sama ochrona co przy zmianie hasła: brute-force hasła przy przejętej
  // sesji plus zasypywanie cudzej skrzynki wiadomościami
  if (await isRateLimited(`emailchange:${session.user.id}`, 3, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Zbyt wiele prób. Spróbuj ponownie za godzinę." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const { newEmail, currentPassword } = (body ?? {}) as {
    newEmail?: unknown;
    currentPassword?: unknown;
  };

  if (typeof currentPassword !== "string" || !currentPassword) {
    return NextResponse.json({ error: "Podaj aktualne hasło." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, password: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Konto Google nie ma hasła, a adres pochodzi stamtąd – nie mamy czym
  // potwierdzić tożsamości i rozjazd adresów myliłby przy logowaniu
  if (!user.password) {
    return NextResponse.json(
      {
        error:
          "Adres tego konta pochodzi z Google i zmienia się go po stronie Google.",
      },
      { status: 400 }
    );
  }

  const check = checkNewEmail(newEmail, user.email);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Aktualne hasło jest nieprawidłowe." }, { status: 400 });
  }

  // Adres sprawdzamy tutaj i **jeszcze raz przy potwierdzeniu** – ktoś mógłby
  // zarejestrować go w międzyczasie
  const taken = await db.user.findFirst({
    where: { email: check.email, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "Ten adres jest już używany przez inne konto." },
      { status: 400 }
    );
  }

  const token = createToken();
  try {
    // Jedno oczekujące żądanie na konto – nowe zastępuje poprzednie, więc
    // starszy link natychmiast przestaje działać
    await db.emailChangeRequest.upsert({
      where: { userId: user.id },
      update: { newEmail: check.email, tokenHash: hashToken(token), expiresAt: expiryFrom() },
      create: {
        userId: user.id,
        newEmail: check.email,
        tokenHash: hashToken(token),
        expiresAt: expiryFrom(),
      },
    });
  } catch (e) {
    console.error("[email-change] zapis żądania nieudany:", e);
    return NextResponse.json(
      { error: "Nie udało się rozpocząć zmiany adresu. Spróbuj ponownie." },
      { status: 500 }
    );
  }

  // Bez wysłanego linku żądanie jest bezużyteczne – kasujemy je, żeby klient
  // mógł spróbować od nowa, zamiast zostać z „oczekującą" zmianą bez maila
  const sent = await sendEmails({
    newEmail: check.email,
    oldEmail: normalizeEmail(user.email),
    token,
    name: user.name,
  });
  if (!sent) {
    await db.emailChangeRequest
      .deleteMany({ where: { userId: user.id } })
      .catch(() => {});
    return NextResponse.json(
      { error: "Nie udało się wysłać wiadomości potwierdzającej. Spróbuj ponownie." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, newEmail: check.email });
}
