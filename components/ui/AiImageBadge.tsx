"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Info } from "lucide-react";

/** Treść wyjaśnienia – ta sama wszędzie, gdzie pokazujemy znaczek. */
export const AI_IMAGE_NOTICE =
  "Wybrane elementy grafiki, takie jak tło lub elementy towarzyszące zostały wygenerowane przy wsparciu AI.";

/** Rozmiary dopasowane do miejsca: karta produktu, kafelek listy, widok kompaktowy. */
const SIZES = {
  lg: { text: "text-[11px] md:text-xs", icon: "w-3.5 h-3.5", gap: "gap-1.5", pad: "px-2 py-1" },
  md: { text: "text-[10px]", icon: "w-3 h-3", gap: "gap-1", pad: "px-1.5 py-0.5" },
  sm: { text: "text-[9px]", icon: "w-2.5 h-2.5", gap: "gap-0.5", pad: "px-1.5 py-0.5" },
} as const;

/**
 * Oznaczenie „AI" na zdjęciu wygenerowanym przez model (sufiks `-ai.webp`).
 *
 * Stoi pod galerią, w ciemnej bryle – czytelnej niezależnie od tego, co jest
 * obok, i spójnej z licznikiem zdjęć w kadrze.
 *
 * Dymek z wyjaśnieniem pojawia się po najechaniu kursorem, a na dotyku po
 * kliknięciu – dlatego całość jest przyciskiem, a nie samym napisem. Znaczek
 * bywa umieszczany w kadrze z gestami albo wewnątrz linku, więc zdarzenia
 * zatrzymujemy na nim: kliknięcie ma pokazać wyjaśnienie, a nie otworzyć
 * produktu ani włączyć lupy.
 */
export default function AiImageBadge({
  size = "md",
  bare = false,
  className = "",
}: {
  size?: keyof typeof SIZES;
  /** true = bez własnej bryły; znaczek dziedziczy tło z kontenera (licznik zdjęć na mobile). */
  bare?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const s = SIZES[size];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative inline-flex ${className}`}>
      {open && (
        <p
          role="tooltip"
          // Dymek wyrasta w prawo od znaczka – ten stoi przy lewej krawędzi kolumny,
          // więc w drugą stronę wychodziłby poza układ strony na wąskim ekranie
          className="absolute bottom-full left-0 mb-2 z-20 w-56 max-w-[70vw] bg-espresso text-cream text-[11px] leading-relaxed px-3 py-2.5 shadow-lg"
        >
          {AI_IMAGE_NOTICE}
        </p>
      )}
      <button
        type="button"
        // Karta produktu na liście jest linkiem, a kadr galerii ma gesty i lupę –
        // bez zatrzymania zdarzeń kliknięcie w znaczek robiłoby coś innego niż
        // pokazanie wyjaśnienia
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={AI_IMAGE_NOTICE}
        aria-expanded={open}
        className={`inline-flex items-center tracking-wider uppercase text-cream transition-colors ${s.gap} ${s.text} ${
          bare ? "" : `bg-espresso/85 hover:bg-espresso ${s.pad}`
        }`}
      >
        <Sparkles className={s.icon} strokeWidth={1.5} aria-hidden="true" />
        AI
        <Info className={s.icon} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
