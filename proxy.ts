// Konwencja `proxy` zastąpiła `middleware` w Next 16 (stara nazwa jest
// przestarzała i ostrzega przy budowaniu). Plik działa tak samo: wykonuje się
// przed wyrenderowaniem trasy, ale zawsze w runtime `nodejs` – runtime `edge`
// nie jest tu obsługiwany. Domyślny eksport jest dozwolony (alternatywa: nazwany
// eksport `proxy`), więc opakowanie z NextAuth zostaje bez zmian.
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
  ],
};
