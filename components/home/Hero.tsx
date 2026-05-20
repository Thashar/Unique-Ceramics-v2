"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Tło */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero.jpg"
          alt="Ceramika ręcznie robiona"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-espresso/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/70 via-espresso/30 to-transparent" />
      </div>

      {/* Treść */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full pt-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="max-w-2xl"
        >
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xs tracking-[0.3em] uppercase text-terracotta mb-6"
          >
            Ceramika ręcznie robiona
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-5xl md:text-6xl lg:text-7xl text-cream leading-[1.1] mb-8"
          >
            Ręcznie tworzone
            <br />
            z sercem
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.75 }}
            className="text-sand/90 text-lg leading-relaxed mb-10 max-w-md"
          >
            Unikalna ceramika użytkowa — każdy egzemplarz jest niepowtarzalny.
            Tworzę z pasją i dbałością o każdy detal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="flex flex-wrap items-center gap-5"
          >
            <Link
              href="/sklep"
              className="inline-flex items-center gap-3 bg-terracotta hover:bg-clay text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300"
            >
              Odkryj kolekcję
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
            <Link
              href="/o-mnie"
              className="inline-flex items-center gap-3 border border-cream/50 hover:border-cream text-cream text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300"
            >
              O mnie
            </Link>
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
        <span className="text-[10px] tracking-[0.25em] uppercase text-cream/50">Przewiń</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="w-px h-10 bg-gradient-to-b from-cream/50 to-transparent"
        />
      </motion.div>
    </section>
  );
}
