import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;

  // Trasy API admina — druga warstwa ochrony obok requireAdmin() w handlerach.
  // (Sama rola ADMIN jest weryfikowana w DB przez requireAdmin; tu blokujemy
  // brak sesji, by błąd w pojedynczym handlerze nie odsłaniał trasy.)
  const isAdminApi = nextUrl.pathname.startsWith("/api/admin");

  // /zamowienie jest celowo POZA ochroną – zamówienie można złożyć bez konta
  // (checkout gościa). Dane zamówienia walidowane są w /api/checkout.
  const isProtectedPage =
    nextUrl.pathname.startsWith("/konto") ||
    nextUrl.pathname.startsWith("/admin");

  // Logowanie i rejestracja nie mają sensu dla kogoś, kto już jest zalogowany –
  // odsyłamy go do panelu konta zamiast pokazywać pusty formularz. Tu, a nie na
  // stronach: obie są klienckie, więc sprawdzenie w komponencie mignęłoby
  // formularzem przed przekierowaniem.
  const isAuthPage =
    nextUrl.pathname === "/logowanie" || nextUrl.pathname === "/rejestracja";

  if (session && isAuthPage) {
    // `callbackUrl` zostaje uszanowany – po wygaśnięciu sesji middleware odsyła
    // na logowanie właśnie z nim, a po ponownym wejściu klient ma wrócić tam,
    // gdzie zmierzał. Przyjmujemy tylko ścieżki względne (bez otwartego
    // przekierowania na obcą domenę).
    const callbackUrl = nextUrl.searchParams.get("callbackUrl");
    const target =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/konto";
    return NextResponse.redirect(new URL(target, nextUrl.origin));
  }

  if (!session) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isProtectedPage) {
      const loginUrl = new URL("/logowanie", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/konto/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/logowanie",
    "/rejestracja",
  ],
};
