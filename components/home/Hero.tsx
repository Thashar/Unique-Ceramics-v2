import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { HOME_HERO_DEFAULT } from "@/lib/home-sections";

/**
 * Sekcja hero strony głównej. **Cały tekst pochodzi z ustawień**
 * (`home_hero_*`, zakładka „Strona główna" w panelu) – wartości domyślne są
 * tylko wtedy, gdy props nie przyszedł. Puste ustawienie **ukrywa** dany
 * element, więc właściciel może zostawić samo zdjęcie.
 *
 * ⚠️ **To komponent serwerowy i ma nim zostać.** Wejścia robił wcześniej
 * framer-motion, przez co nagłówek i opis wychodziły z serwera z
 * `style="opacity:0"` i pojawiały się dopiero po pobraniu i wykonaniu ~310 KiB
 * JS – na telefonie dawało to LCP 5,7 s przy FCP 1,2 s (PageSpeed, 14.09.2026).
 * Choreografia jest ta sama, ale idzie z CSS (`uc-reveal` / `uc-fade`
 * w `app/globals.css`), więc startuje przy pierwszym malowaniu i nie czeka
 * na hydratację. **Nie przywracaj tu animacji w JS.**
 */

/** Styl wejścia: dystans najazdu, czas trwania i opóźnienie – jak we framer-motion. */
type RevealStyle = CSSProperties & { "--uc-reveal-y"?: string };

function reveal(delay: number, duration: number, y: number): RevealStyle {
  return {
    "--uc-reveal-y": `${y}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

export default function Hero({
  heroImage = "",
  heroPosition = "50% 50%",
  eyebrow = HOME_HERO_DEFAULT.eyebrow,
  title = HOME_HERO_DEFAULT.title,
  text = HOME_HERO_DEFAULT.text,
  ctaPrimary = HOME_HERO_DEFAULT.ctaPrimary,
  ctaSecondary = HOME_HERO_DEFAULT.ctaSecondary,
  scrollLabel = HOME_HERO_DEFAULT.scroll,
}: {
  heroImage?: string;
  heroPosition?: string;
  eyebrow?: string;
  /** Nagłówek – nowe wiersze łamią go tak, jak wpisano w panelu. */
  title?: string;
  text?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  scrollLabel?: string;
}) {
  return (
    <section className="relative flex items-center overflow-hidden" style={{ height: "100svh" }} data-snap data-header-theme="transparent">
      {/* Tło */}
      <div className="absolute inset-0 bg-espresso">
        {heroImage && (
          <Image
            src={heroImage}
            alt="Ceramika ręcznie robiona"
            fill
            priority
            // Zdjęcie hero jest kandydatem na LCP, a konkuruje o pasmo
            // z kilkunastoma paczkami JS. `priority` samo nie wystarczyło –
            // Next nie dokładał `fetchpriority`, więc obrazek schodził
            // z sieci po skryptach.
            fetchPriority="high"
            className="object-cover"
            style={{ objectPosition: heroPosition }}
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-espresso/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/70 via-espresso/30 to-transparent" />
      </div>

      {/* Treść */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full pt-14 md:pt-20">
        <div className="max-w-2xl uc-fade" style={{ animationDelay: "0.2s" }}>
          {eyebrow && (
            <p
              className="uc-reveal text-xs tracking-[0.3em] uppercase text-terracotta mb-6"
              style={reveal(0.4, 0.8, 16)}
            >
              {eyebrow}
            </p>
          )}

          {title && (
            <h1
              // whitespace-pre-line: Enter w polu panelu łamie wiersz nagłówka
              className="uc-reveal font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-cream leading-[1.1] mb-8 whitespace-pre-line"
              style={{ ...reveal(0.55, 0.9, 24), animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              {title}
            </h1>
          )}

          {text && (
            <p
              className="uc-reveal text-sand/90 text-lg leading-relaxed mb-10 max-w-md whitespace-pre-line"
              style={reveal(0.75, 0.8, 16)}
            >
              {text}
            </p>
          )}

          <div className="uc-reveal flex flex-wrap items-center gap-5" style={reveal(0.9, 0.7, 12)}>
            {ctaPrimary && (
              <Link
                href="/sklep"
                className="inline-flex items-center gap-3 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300 rounded-md"
              >
                {ctaPrimary}
                <ArrowRight size={16} strokeWidth={1.5} />
              </Link>
            )}
            {ctaSecondary && (
              <Link
                href="/o-mnie"
                className="inline-flex items-center gap-3 border border-cream/50 hover:border-cream text-cream text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300 rounded-md"
              >
                {ctaSecondary}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Scroll indicator – `uc-fade` (nie `uc-reveal`), bo element ma własne
          wyśrodkowanie przez `-translate-x-1/2` */}
      <div
        className="uc-fade absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ animationDelay: "1.5s" }}
      >
        {scrollLabel && (
          <span className="text-[10px] tracking-[0.25em] uppercase text-cream/70">{scrollLabel}</span>
        )}
        <div className="uc-float w-px h-10 bg-gradient-to-b from-cream/50 to-transparent" />
      </div>
    </section>
  );
}
