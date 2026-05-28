"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function WorkshopsTeaser({
  workshopsImage = "/images/warsztaty-photo.jpg",
  workshopsPosition = "50% 50%",
}: {
  workshopsImage?: string;
  workshopsPosition?: string;
}) {
  return (
    <section
      className="relative overflow-hidden flex items-center"
      style={{ height: "100svh" }}
      data-snap
    >
      {/* Tło */}
      <div className="absolute inset-0">
        <Image
          src={workshopsImage}
          alt="Warsztaty ceramiczne"
          fill
          className="object-cover"
          style={{ objectPosition: workshopsPosition }}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-espresso/75" />
      </div>

      {/* Treść — taka sama struktura jak Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full pt-20">
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4"
          >
            Warsztaty
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-4xl md:text-5xl text-cream leading-tight mb-6"
          >
            Spróbuj stworzyć
            <br />
            coś własnego
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-sand/80 leading-relaxed mb-10"
          >
            Organizuję warsztaty ceramiczne dla grup i indywidualnych uczestników.
            Idealne na urodziny, wieczory panieńskie, imprezy firmowe czy po prostu
            wyjątkowy wieczór z przyjaciółmi. Nie potrzebujesz żadnego doświadczenia!
          </motion.p>

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
              Zobacz terminy
              <ArrowRight
                size={16}
                strokeWidth={1.5}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
