"use client";

import { SessionProvider, useSession } from "next-auth/react";
import CookieBanner from "@/components/layout/CookieBanner";
import CartToasts from "@/components/ui/CartToasts";
import { useCartAccountSync } from "@/lib/cart";

// Koszyk i zgoda na cookies to store'y modułowe (useSyncExternalStore) –
// nie potrzebują providerów
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartAccountSync />
      {children}
      <CookieBanner />
      {/* Komunikaty koszyka muszą być widoczne z każdej strony – koszyk potrafi
          zmienić się w tle (ktoś inny kupił ostatnią sztukę) */}
      <CartToasts />
    </SessionProvider>
  );
}

/**
 * Trzyma koszyk w zgodzie z kontem: scala po zalogowaniu, zapisuje przy zmianach,
 * czyści po wylogowaniu. Osobny komponent, bo `useSession` wymaga bycia
 * **wewnątrz** `SessionProvider`.
 */
function CartAccountSync() {
  const { data: session, status } = useSession();
  useCartAccountSync(status, session?.user?.id ?? null);
  return null;
}
