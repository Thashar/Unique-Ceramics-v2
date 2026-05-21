"use client";

import { motion } from "framer-motion";
import InstagramIcon from "@/components/ui/InstagramIcon";

export default function InstagramCta({ instagram }: { instagram: string }) {
  const handle = instagram.startsWith("@") ? instagram.slice(1) : instagram;
  const href = `https://instagram.com/${handle}`;

  return (
    <section className="py-24 px-6 text-center bg-sand">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl mx-auto"
      >
        <InstagramIcon size={32} className="mx-auto text-clay mb-6" />
        <h2 className="font-serif text-3xl md:text-4xl text-espresso mb-4">
          Śledź moją pracownię
        </h2>
        <p className="text-charcoal/70 mb-8 leading-relaxed">
          Na Instagramie pokazuję proces tworzenia, nowe prace i zakulisowe
          chwile z pracowni.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-espresso hover:bg-charcoal text-cream text-sm tracking-widest uppercase px-8 py-4 transition-colors duration-300"
        >
          <InstagramIcon size={15} />
          {instagram.startsWith("@") ? instagram : `@${instagram}`}
        </a>
      </motion.div>
    </section>
  );
}
