"use client";

import { motion } from "framer-motion";
import InstagramIcon from "@/components/ui/InstagramIcon";
import { ArrowRight } from "lucide-react";

export default function InstagramCta({ instagram }: { instagram: string }) {
  const handle = instagram.startsWith("@") ? instagram.slice(1) : instagram;
  const displayHandle = instagram.startsWith("@") ? instagram : `@${instagram}`;
  const href = `https://instagram.com/${handle}`;

  return (
    <section
      className="relative bg-espresso overflow-hidden px-6 flex flex-col justify-center py-16"
      style={{ height: "100svh" }}
      data-snap
    >
      {/* Dekoracyjne okręgi */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-clay/10 rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-terracotta/8 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-terracotta/30 rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-xl mx-auto text-center"
      >
        {/* Ikona */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terracotta/15 border border-terracotta/30 mb-7">
          <InstagramIcon size={26} className="text-terracotta" />
        </div>

        <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4 leading-snug">
          Śledź moją pracownię
        </h2>
        <p className="text-sand/65 mb-8 leading-relaxed max-w-sm mx-auto">
          Na Instagramie pokazuję proces tworzenia, nowe prace
          i zakulisowe chwile z pracowni.
        </p>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3 border border-terracotta/50 hover:border-terracotta hover:bg-terracotta text-cream text-sm tracking-widest uppercase px-8 py-4 transition-all duration-300"
        >
          <InstagramIcon size={15} />
          {displayHandle}
          <ArrowRight
            size={14}
            strokeWidth={1.5}
            className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
          />
        </a>
      </motion.div>
    </section>
  );
}
