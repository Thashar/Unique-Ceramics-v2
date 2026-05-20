import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;

  const isProtected =
    nextUrl.pathname.startsWith("/konto") ||
    nextUrl.pathname.startsWith("/zamowienie");

  if (isProtected && !session) {
    const loginUrl = new URL("/logowanie", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/konto/:path*", "/zamowienie/:path*"],
};
