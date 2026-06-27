"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const DUR = 3; // długość pętli w sekundach

// Czubek palca wskazującego w układzie współrzędnych obróconego wrappera
// (rozmiar wrappera = 18×18, ikona w viewBox 24, czubek w (8.7, 2))
const TIP_LEFT = (8.7 / 24) * 18; // ≈ 6.5 px
const TIP_TOP = (2 / 24) * 18; //   ≈ 1.5 px

// Gruba kreska "rozbryzgu" wylatująca z czubka wysuniętego palca wskazującego
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
        height: 2.5,
        background: "currentColor",
        borderRadius: 2,
        top: TIP_TOP,
        left: TIP_LEFT,
        // kreska rośnie od czubka palca na zewnątrz
        transformOrigin: "left center",
        // rotate jako liczba → Framer Motion uwzględnia go w tym samym
        // pipeline co animowane x/y, bez konfliktu z CSS transform
        rotate: angle,
      }}
      animate={{
        x:       [0,  0,  dx * 4,  dx * 11,  dx * 15],
        y:       [0,  0,  dy * 4,  dy * 11,  dy * 15],
        opacity: [0,  0,  1,       0.5,      0],
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

// Wypełniona dłoń z 5 wyraźnymi palcami: palec wskazujący wysunięty
// najwyżej (czubek w (8.7, 2)), z którego strzela rozbryzg kresek
function HandIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* dłoń */}
      <rect x="6" y="9" width="13" height="12" rx="4.5" />
      {/* kciuk (odchylony w bok) */}
      <rect x="3" y="9.5" width="3" height="7.5" rx="1.5" transform="rotate(-32 4.5 13)" />
      {/* palec wskazujący — wysunięty */}
      <rect x="7" y="2" width="3.4" height="12" rx="1.7" />
      {/* środkowy */}
      <rect x="10.6" y="5" width="3.4" height="10" rx="1.7" />
      {/* serdeczny */}
      <rect x="14.2" y="6" width="3.4" height="9" rx="1.7" />
      {/* mały */}
      <rect x="17.4" y="8" width="3" height="7" rx="1.5" />
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
        style={{ width: 24, height: 24 }}
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
        {/* dłoń + rozbryzg obrócone o 45° w lewo; rozbryzg strzela z czubka palca */}
        <span
          className="relative block"
          style={{ width: 18, height: 18, rotate: "-45deg" }}
        >
          <HandIcon />
          {/* wachlarz grubych kresek wychodzący z czubka palca wskazującego (w górę = -90°) */}
          {[-130, -110, -90, -70, -50].map((angle) => (
            <ClickSpark key={angle} angle={angle} />
          ))}
        </span>
      </motion.span>
      <span>Zamów indywidualnie</span>
    </Link>
  );
}
