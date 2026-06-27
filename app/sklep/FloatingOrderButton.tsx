"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const DUR = 3; // długość pętli w sekundach

// Kreska lecąca od centrum w kierunku `angle` — pojawia się przy "kliknięciu"
function ClickSpark({ angle }: { angle: number }) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);

  return (
    <motion.span
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        display: "block",
        width: 6,
        height: 1.5,
        background: "currentColor",
        borderRadius: 1,
        top: "calc(50% - 0.75px)",
        left: "calc(50% - 3px)",
        // rotate jako liczba → Framer Motion uwzględnia go w tym samym
        // pipeline co animowane x/y, bez konfliktu z CSS transform
        rotate: angle,
      }}
      animate={{
        x:       [0,  0,  dx * 3,  dx * 9,  dx * 11],
        y:       [0,  0,  dy * 3,  dy * 9,  dy * 11],
        opacity: [0,  0,  1,       0.4,     0],
      }}
      transition={{
        duration: DUR,
        repeat: Infinity,
        times: [0, 0.57, 0.67, 0.84, 1.0],
        ease: "easeOut",
      }}
    />
  );
}

// Wypełniona ikona wskaźnika-dłoni: palec wskazujący (wyższy prostokąt)
// + dłoń/pięść (szerszy prostokąt, nakładający się = unia kształtów)
function HandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="9" y="1" width="6" height="16" rx="3" />
      <rect x="3" y="12" width="18" height="11" rx="5" />
    </svg>
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
        style={{ width: 22, height: 22 }}
        // 0–0.5s: trzęsienie lewo-prawo; 0.6s: przyciśnięcie w dół; 0.75s: powrót; pauza
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
        <HandIcon />
        {/* 4 kreski ukośne — efekt kliknięcia */}
        {[45, 135, 225, 315].map((angle) => (
          <ClickSpark key={angle} angle={angle} />
        ))}
      </motion.span>
      <span>Zamów indywidualnie</span>
    </Link>
  );
}
