import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;

  // Trasy API admina — druga warstwa ochrony obok requireAdmin() w handlerach.
  // (Sama rola ADMIN jest weryfikowana w DB przez requireAdmin; tu blokujemy
  // brak sesji, by błąd w pojedynczym handlerze nie odsłaniał trasy.)
  const isAdminApi = nextUrl.pathname.startsWith("/api/admin");

  const isProtectedPage =
    nextUrl.pathname.startsWith("/konto") ||
    nextUrl.pathname.startsWith("/zamowienie") ||
    nextUrl.pathname.startsWith("/admin");

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
    "/zamowienie/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
