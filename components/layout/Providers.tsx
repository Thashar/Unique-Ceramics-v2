"use client";

import { SessionProvider } from "next-auth/react";
import CookieBanner from "@/components/layout/CookieBanner";

// Koszyk i zgoda na cookies to store'y modułowe (useSyncExternalStore) —
// nie potrzebują providerów
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CookieBanner />
    </SessionProvider>
  );
}
