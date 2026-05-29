"use client";

import { motion } from "framer-motion";
import InstagramIcon from "@/components/ui/InstagramIcon";
import { ArrowRight } from "lucide-react";

export default function FooterInstagramPanel({ instagram }: { instagram: string }) {
  const handle = instagram.startsWith("@") ? instagram.slice(1) : instagram;
  const displayHandle = instagram.startsWith("@") ? instagram : `@${instagram}`;
  const href = `https://instagram.com/${handle}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col"
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-terracotta/15 border border-terracotta/30 mb-6">
        <InstagramIcon size={22} className="text-terracotta" />
      </div>

      <h2 className="font-serif text-2xl lg:text-3xl text-cream mb-3 leading-snug">
        Śledź moją pracownię
      </h2>
      <p className="text-sand/60 text-sm leading-relaxed mb-7 max-w-xs">
        Na Instagramie pokazuję proces tworzenia, nowe prace i zakulisowe chwile z pracowni.
      </p>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-3 border border-terracotta/50 hover:border-terracotta hover:bg-terracotta text-cream text-sm tracking-widest uppercase px-6 py-3.5 transition-all duration-300 self-start"
      >
        <InstagramIcon size={14} />
        {displayHandle}
        <ArrowRight
          size={13}
          strokeWidth={1.5}
          className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
        />
      </a>
    </motion.div>
  );
}
