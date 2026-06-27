"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const DUR = 3;

// Kreska wylatująca z czubka palca wskazującego — efekt kliknięcia
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
        width: 9,
        height: 3,
        background: "currentColor",
        borderRadius: 1.5,
        // czubek palca wskazującego po obrocie -45° ≈ (-6.5, -3.5) od środka
        top: "calc(50% - 5px)",
        left: "calc(50% - 11px)",
        rotate: angle,
      }}
      animate={{
        x:       [0,  0,  dx * 4,  dx * 12,  dx * 14],
        y:       [0,  0,  dy * 4,  dy * 12,  dy * 14],
        opacity: [0,  0,  1,       0.4,      0],
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

// Dłoń z 5 palcami (palec wskazujący wysunięty, pozostałe krótsze),
// obrócona o -45° — palec wskazuje w górę-lewo
function HandIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ transform: "rotate(-45deg)" }}
    >
      {/* Kciuk — poziomy, po lewej */}
      <rect x="0" y="13" width="9" height="5" rx="2.5" />
      {/* Palec wskazujący — najwyższy */}
      <rect x="7" y="2" width="5" height="14" rx="2.5" />
      {/* Palec środkowy */}
      <rect x="12" y="5" width="5" height="11" rx="2" />
      {/* Palec serdeczny */}
      <rect x="17" y="7" width="4" height="9" rx="2" />
      {/* Mały palec — najkrótszy */}
      <rect x="21" y="9" width="3" height="7" rx="1.5" />
      {/* Dłoń */}
      <rect x="4" y="13" width="19" height="10" rx="4" />
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
        {/* Wachlarz kresek w kierunku, w którym celuje palec wskazujący (górny-lewy) */}
        {[180, 205, 225, 250, 275].map((angle) => (
          <ClickSpark key={angle} angle={angle} />
        ))}
      </motion.span>
      <span>Zamów indywidualnie</span>
    </Link>
  );
}
