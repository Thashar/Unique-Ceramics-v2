"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HOME_WORKSHOPS_DEFAULT } from "@/lib/home-sections";

/**
 * Pełnoekranowa sekcja „Warsztaty" na stronie głównej. **Cały tekst pochodzi
 * z ustawień** (`home_workshops_*`, zakładka „Strona główna" w panelu);
 * wartości domyślne wchodzą tylko wtedy, gdy props nie przyszedł, a puste
 * ustawienie **ukrywa** dany element.
 */
export default function WorkshopsTeaser({
  workshopsImage = "",
  workshopsPosition = "50% 50%",
  eyebrow = HOME_WORKSHOPS_DEFAULT.eyebrow,
  title = HOME_WORKSHOPS_DEFAULT.title,
  text = HOME_WORKSHOPS_DEFAULT.text,
  cta = HOME_WORKSHOPS_DEFAULT.cta,
}: {
  workshopsImage?: string;
  workshopsPosition?: string;
  eyebrow?: string;
  /** Nagłówek – nowe wiersze łamią go tak, jak wpisano w panelu. */
  title?: string;
  /** Opis – pusta linia robi odstęp między akapitami. */
  text?: string;
  cta?: string;
}) {
  return (
    <section
      className="relative overflow-hidden flex items-center"
      style={{ height: "100svh" }}
      data-snap
      data-header-theme="transparent"
    >
      {/* Tło */}
      <div className="absolute inset-0 bg-espresso">
        {workshopsImage && (
          <Image
            src={workshopsImage}
            alt="Warsztaty ceramiczne"
            fill
            className="object-cover"
            style={{ objectPosition: workshopsPosition }}
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-espresso/75" />
      </div>

      {/* Treść – taka sama struktura jak Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full pt-20">
        <div className="max-w-xl">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4"
            >
              {eyebrow}
            </motion.p>
          )}

          {title && (
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              // whitespace-pre-line: Enter w polu panelu łamie wiersz nagłówka
              className="font-serif text-4xl md:text-5xl text-cream leading-tight mb-6 whitespace-pre-line"
            >
              {title}
            </motion.h2>
          )}

          {text && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-sand/80 leading-relaxed mb-10 whitespace-pre-line"
            >
              {text}
            </motion.p>
          )}

          {cta && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link
                href="/warsztaty"
                className="inline-flex items-center gap-3 border border-cream/60 hover:border-cream text-cream text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300 group"
              >
                {cta}
                <ArrowRight
                  size={16}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
