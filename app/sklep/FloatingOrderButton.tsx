"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function FloatingOrderButton() {
  return (
    <Link
      href="/zamowienie-indywidualne"
      className="fixed bottom-6 right-5 z-40 flex items-center gap-2.5 bg-espresso hover:bg-clay text-cream text-[11px] tracking-widest uppercase px-4 py-3 shadow-md hover:shadow-lg transition-colors duration-200"
    >
      {/* Łapka: podwójne stuknięcie, pauza — 3s pętla */}
      <motion.span
        aria-hidden="true"
        className="text-[15px] leading-none select-none"
        animate={{
          y:      [0,  5,  0,  5,  0,  0],
          scale:  [1, 0.8,  1, 0.8,  1,  1],
          rotate: [0,  -8,  0, -8,  0,  0],
        }}
        transition={{
          duration: 2.5,
          repeatDelay: 0.5,
          times: [0, 0.1, 0.22, 0.32, 0.44, 1],
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        👆
      </motion.span>
      <span>Zamów indywidualnie</span>
    </Link>
  );
}
