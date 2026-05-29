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
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-sand/80 leading-relaxed">
          Ta strona używa plików cookie niezbędnych do działania koszyka i sesji logowania
          oraz opcjonalnych plików Google Maps.{" "}
          <Link
            href="/polityka-prywatnosci"
            className="text-terracotta hover:text-cream underline transition-colors"
          >
            Polityka prywatności
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={acceptNecessary}
            className="text-xs tracking-widest uppercase px-4 py-2.5 border border-sand/30 text-sand/60 hover:text-cream hover:border-sand/60 transition-colors"
          >
            Tylko niezbędne
          </button>
          <button
            onClick={acceptAll}
            className="text-xs tracking-widest uppercase px-5 py-2.5 bg-terracotta hover:bg-clay text-warm-white transition-colors"
          >
            Akceptuję wszystkie
          </button>
        </div>
      </div>
    </div>
  );
}
