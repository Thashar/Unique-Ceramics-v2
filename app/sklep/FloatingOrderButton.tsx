"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Pointer } from "lucide-react";

const DUR = 3; // długość pętli w sekundach

// Pojedyncza kreska rozchodząca się od centrum — pojawia się przy "kliknięciu"
function ClickSpark({ angle }: { angle: number }) {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute"
      style={{
        display: "block",
        width: 7,
        height: 1.5,
        background: "currentColor",
        borderRadius: 1,
        top: "calc(50% - 0.75px)",
        left: "50%",
        rotate: `${angle}deg`,
        transformOrigin: "left center",
      }}
      animate={{
        scaleX: [0, 0, 0.2, 1.5, 0],
        opacity: [0, 0, 1, 0.4, 0],
      }}
      transition={{
        duration: DUR,
        repeat: Infinity,
        times: [0, 0.57, 0.66, 0.84, 1.0],
        ease: "easeOut",
      }}
    />
  );
}

export default function FloatingOrderButton() {
  return (
    <Link
      href="/zamowienie-indywidualne"
      className="fixed bottom-6 right-5 z-40 flex items-center gap-2.5 bg-espresso hover:bg-clay text-cream text-[11px] tracking-widest uppercase px-4 py-3 shadow-md hover:shadow-lg transition-colors duration-200"
    >
      <motion.span
        aria-hidden="true"
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: 20, height: 20 }}
        // 0–0.4s: trzęsienie; 0.6s: przyciśnięcie; 0.75s: powrót; 0.75–3s: pauza
        animate={{
          x:     [0, -2,  3, -3,  2, -1,  1,  0,  0,     0,  0],
          y:     [0,  0,  0,  0,  0,  0,  0,  0,  3,     0,  0],
          scale: [1,  1,  1,  1,  1,  1,  1,  1,  0.88,  1,  1],
        }}
        transition={{
          duration: DUR,
          repeat: Infinity,
          times: [0, 0.05, 0.10, 0.16, 0.21, 0.27, 0.32, 0.50, 0.60, 0.75, 1],
          ease: "easeInOut",
        }}
      >
        <Pointer size={15} strokeWidth={1.5} />

        {/* 4 kreski w ukos: efekt kliknięcia */}
        {[45, 135, 225, 315].map((angle) => (
          <ClickSpark key={angle} angle={angle} />
        ))}
      </motion.span>
      <span>Zamów indywidualnie</span>
    </Link>
  );
}
