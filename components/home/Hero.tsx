"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HOME_HERO_DEFAULT } from "@/lib/home-sections";

/**
 * Sekcja hero strony głównej. **Cały tekst pochodzi z ustawień**
 * (`home_hero_*`, zakładka „Strona główna" w panelu) – wartości domyślne są
 * tylko wtedy, gdy props nie przyszedł. Puste ustawienie **ukrywa** dany
 * element, więc właściciel może zostawić samo zdjęcie.
 */
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="max-w-2xl"
        >
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xs tracking-[0.3em] uppercase text-terracotta mb-6"
            >
              {eyebrow}
            </motion.p>
          )}

          {title && (
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              // whitespace-pre-line: Enter w polu panelu łamie wiersz nagłówka
              className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-cream leading-[1.1] mb-8 whitespace-pre-line"
            >
              {title}
            </motion.h1>
          )}

          {text && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.75 }}
              className="text-sand/90 text-lg leading-relaxed mb-10 max-w-md whitespace-pre-line"
            >
              {text}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="flex flex-wrap items-center gap-5"
          >
            {ctaPrimary && (
              <Link
                href="/sklep"
                className="inline-flex items-center gap-3 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300"
              >
                {ctaPrimary}
                <ArrowRight size={16} strokeWidth={1.5} />
              </Link>
            )}
            {ctaSecondary && (
              <Link
                href="/o-mnie"
                className="inline-flex items-center gap-3 border border-cream/50 hover:border-cream text-cream text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300"
              >
                {ctaSecondary}
              </Link>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        {scrollLabel && (
          <span className="text-[10px] tracking-[0.25em] uppercase text-cream/70">{scrollLabel}</span>
        )}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="w-px h-10 bg-gradient-to-b from-cream/50 to-transparent"
        />
      </motion.div>
    </section>
  );
}
