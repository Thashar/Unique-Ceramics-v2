"use client";

import Link from "next/link";
import { useCookieConsent } from "@/lib/cookie-consent";

export default function CookieBanner() {
  const { consent, hydrated, acceptAll, acceptNecessary } = useCookieConsent();

  // Nie renderuj podczas SSR ani gdy użytkownik już wybrał
  if (!hydrated || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Zgoda na pliki cookie"
      className="fixed bottom-0 left-0 right-0 z-[200] bg-espresso border-t border-sand/10 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-3 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <p className="text-[10px] sm:text-sm text-sand/80 whitespace-nowrap sm:whitespace-normal sm:leading-relaxed sm:flex-1">
          <span className="sm:hidden">
            Używamy cookies (koszyk, sesja, mapy).{" "}
          </span>
          <span className="hidden sm:inline">
            Ta strona używa plików cookie niezbędnych do działania koszyka i sesji logowania
            oraz opcjonalnych plików Google Maps.{" "}
          </span>
          <Link
            href="/polityka-prywatnosci"
            className="text-terracotta hover:text-cream underline transition-colors"
          >
            Polityka prywatności
          </Link>
        </p>
        <div className="flex gap-2 sm:gap-3 shrink-0">
          <button
            onClick={acceptNecessary}
            className="text-[10px] sm:text-xs tracking-widest uppercase px-2.5 py-1.5 sm:px-4 sm:py-2.5 border border-sand/30 text-sand/60 hover:text-cream hover:border-sand/60 transition-colors whitespace-nowrap"
          >
            Tylko niezbędne
          </button>
          <button
            onClick={acceptAll}
            className="text-[10px] sm:text-xs tracking-widest uppercase px-3 py-1.5 sm:px-5 sm:py-2.5 bg-clay hover:bg-terracotta text-warm-white transition-colors whitespace-nowrap"
          >
            Akceptuję wszystkie
          </button>
        </div>
      </div>
    </div>
  );
}
