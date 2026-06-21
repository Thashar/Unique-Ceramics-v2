"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Gdy przeglądarka przywraca stronę z bfcache (back/forward cache) po wylogowaniu,
// JavaScript nadal działa ale sesja już nie istnieje. Ten komponent wymusza pełne
// przeładowanie strony przy przywróceniu z bfcache, żeby middleware sprawdził sesję.
export default function BfcacheGuard() {
  const router = useRouter();

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        router.refresh();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  return null;
}
