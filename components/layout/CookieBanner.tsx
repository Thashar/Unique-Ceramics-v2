"use client";

import Link from "next/link";
import { useCookieConsent } from "@/lib/cookie-consent";

/**
 * Baner zgody na cookies.
 *
 * ⚠️ **Renderuje się już w HTML z serwera – nie dodawaj tu bramki `!hydrated`.**
 * Wcześniej ją miał i przez to pojawiał się dopiero po hydratacji. PageSpeed
 * wskazał go jako **element LCP** z rozbiciem „czas do pierwszego bajtu 0 ms,
 * opóźnienie renderowania elementu **2290 ms**" (14.09.2026) – czyli LCP całej
 * strony czekało na pobranie i wykonanie ~175 KiB JS.
 *
 * Teraz baner jest w HTML od razu, a przed pierwszym malowaniem ukrywa go CSS:
 * skrypt w `<head>` (`app/layout.tsx`) czyta `COOKIE_CONSENT_KEY` z localStorage
 * i przy zapisanej zgodzie ustawia `data-cc` na `<html>`, co zdejmuje baner
 * regułą `html[data-cc] .uc-cookie-banner` z `app/globals.css`. Kto już wybrał,
 * nie zobaczy mignięcia; kto nie wybrał, widzi baner od pierwszej klatki.
 * Po hydratacji React usuwa go z DOM normalną ścieżką (`consent !== null`).
 *
 * Baner jest `fixed`, więc nie wchodzi w układ strony – CLS zostaje 0.
 */
export default function CookieBanner() {
  const { consent, acceptAll, acceptNecessary } = useCookieConsent();

  // Po hydratacji: użytkownik już wybrał – baner znika z DOM.
  // Podczas SSR `consent` to `null`, więc baner trafia do HTML-a.
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Zgoda na pliki cookie"
      className="uc-cookie-banner fixed bottom-0 left-0 right-0 z-[200] bg-espresso border-t border-sand/10 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-3 sm:py-5 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
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
            className="text-[10px] sm:text-xs tracking-widest uppercase px-2.5 py-1.5 sm:px-4 sm:py-2.5 border border-sand/30 text-sand/60 hover:text-cream hover:border-sand/60 transition-colors whitespace-nowrap rounded-md"
          >
            Tylko niezbędne
          </button>
          <button
            onClick={acceptAll}
            className="text-[10px] sm:text-xs tracking-widest uppercase px-3 py-1.5 sm:px-5 sm:py-2.5 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white transition-colors whitespace-nowrap rounded-md"
          >
            Akceptuję wszystkie
          </button>
        </div>
      </div>
    </div>
  );
}
