"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const DUR = 3; // długość pętli w sekundach

// Czubek palca wskazującego w układzie współrzędnych obróconego wrappera
// (rozmiar wrappera = 18×18, ikona w viewBox 24, czubek w (8.7, 2))
const TIP_LEFT = (8.7 / 24) * 18; // ≈ 6.5 px
const TIP_TOP = (0 / 24) * 18; //   ≈ 0 px (czubek palca po wydłużeniu)

const REACH = 4.81; // długość smugi = zasięg (px)

// Cienka smuga "rozbryzgu" od czubka wysuniętego palca wskazującego.
//
// Obrót jest STATYCZNY (na wrapperze, pivot w czubku palca) — kierunek smugi
// jest stały, brak animacji obrotu = brak „przekręcania" i stanów pośrednich.
// Wewnętrzny pasek animuje tylko wzdłuż własnej (poziomej) osi:
//   • 0.22→0.31  tworzenie OD PALCA na zewnątrz: lewy (bliższy) koniec stoi przy
//                palcu, smuga rośnie na pełną długość (scaleX 0→1),
//   • 0.31→0.50  znikanie OD PALCA na zewnątrz: dalszy koniec stoi w miejscu na
//                zasięgu (x + scaleX·REACH = REACH), a bliższy koniec odjeżdża
//                (x 0→REACH, scaleX 1→0).
function ClickSpark({ angle }: { angle: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        left: TIP_LEFT,
        top: TIP_TOP,
        width: REACH,
        height: 0.875,
        transformOrigin: "left center",
        transform: `rotate(${angle}deg)`,
      }}
    >
      <motion.span
        className="block"
        style={{
          width: REACH,
          height: 0.875,
          background: "currentColor",
          borderRadius: 1,
          transformOrigin: "left center",
        }}
        animate={{
          scaleX: [0, 0,    1,    0],
          x:      [0, 0,    0,    REACH],
        }}
        transition={{
          duration: DUR,
          repeat: Infinity,
          // niewidoczne do 0.22 (dłoń najniżej / palec najmniejszy)
          times: [0, 0.22, 0.283, 0.50],
          ease: "easeOut",
        }}
      />
    </span>
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
      <rect x="7" y="0" width="3.4" height="14" rx="1.7" />
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
      /* przycisk 2x większy, zakotwiczony w prawym dolnym rogu (rośnie w stronę środka, nie wychodzi poza ekran) */
      className="fixed bottom-6 right-5 z-40 origin-bottom-right md:scale-[2] flex items-center gap-2.5 bg-espresso hover:bg-clay text-cream text-[11px] tracking-widest uppercase px-4 py-3 shadow-md hover:shadow-lg transition-colors duration-200"
    >
      <motion.span
        aria-hidden="true"
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: 24, height: 24 }}
        // bardzo szybkie trzęsienie (0–0.13s), przyciśnięcie w dół do najniższej
        // pozycji w 0.22, powrót w 0.30, potem długa pauza
        animate={{
          x:     [0, -2.1,  2.1, -2.1,  2.1, -1.4, 0, 0,  2.1, 0, 0],
          y:     [0,  2.1, -2.1,  2.1, -2.1,  1.4, 0, 0, -2.1, 0, 0],
          scale: [1,  1,   1,    1,   1,    1,   1, 1, 0.88,  1, 1],
        }}
        transition={{
          duration: DUR,
          repeat: Infinity,
          times: [0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.13, 0.18, 0.22, 0.30, 1],
          ease: "easeInOut",
        }}
      >
        {/* dłoń + rozbryzg obrócone o 45° w lewo; rozbryzg strzela z czubka palca */}
        <span
          className="relative block"
          style={{ width: 18, height: 18, rotate: "-45deg" }}
        >
          <HandIcon />
          {/* 8 cienkich kresek rozchodzących się w każdą stronę z czubka palca */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ClickSpark key={angle} angle={angle} />
          ))}
        </span>
      </motion.span>
      <span>Zamów indywidualnie</span>
    </Link>
  );
}
