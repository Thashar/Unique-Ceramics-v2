"use client";

import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/lib/cart";
import { CookieConsentProvider } from "@/lib/cookie-consent";
import CookieBanner from "@/components/layout/CookieBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CookieConsentProvider>
        <CartProvider>
          {/* Cel skip-to-content — focusowalny przez JS, niewidoczny wizualnie */}
          <span id="main-content" tabIndex={-1} />
          {children}
          <CookieBanner />
        </CartProvider>
      </CookieConsentProvider>
    </SessionProvider>
  );
}
