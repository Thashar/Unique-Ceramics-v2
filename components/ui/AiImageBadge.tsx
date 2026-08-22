"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Info } from "lucide-react";

/** Treść wyjaśnienia – ta sama wszędzie, gdzie pokazujemy znaczek. */
export const AI_IMAGE_NOTICE =
  "Wybrane elementy grafiki, takie jak tło lub elementy towarzyszące zostały wygenerowane przy wsparciu AI.";

/**
 * Oznaczenie „AI" pod zdjęciem wygenerowanym przez model (sufiks `-ai.webp`).
 *
 * Dymek z wyjaśnieniem pojawia się po najechaniu kursorem, a na dotyku po
 * kliknięciu – dlatego całość jest przyciskiem, a nie samym napisem. Znaczek
 * bywa umieszczony wewnątrz linku (karta produktu na liście), więc kliknięcie
 * zatrzymujemy na nim: ma pokazać wyjaśnienie, a nie otworzyć produkt.
 */
export default function AiImageBadge({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const small = size === "sm";

  return (
    <div ref={wrapperRef} className={`relative inline-flex ${className}`}>
      {open && (
        <p
          role="tooltip"
          className={`absolute bottom-full right-0 mb-2 z-20 bg-espresso text-cream leading-relaxed shadow-lg ${
            small ? "w-44 text-[10px] px-2.5 py-2" : "w-60 text-[11px] px-3 py-2.5"
          }`}
        >
          {AI_IMAGE_NOTICE}
        </p>
      )}
      <button
        type="button"
        // Karta produktu na liście jest linkiem – bez zatrzymania zdarzenia
        // kliknięcie w znaczek otwierałoby stronę produktu zamiast wyjaśnienia
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={AI_IMAGE_NOTICE}
        aria-expanded={open}
        className={`inline-flex items-center text-clay hover:text-espresso transition-colors tracking-wider uppercase ${
          small ? "gap-1 text-[9px]" : "gap-1.5 text-[10px]"
        }`}
      >
        <Sparkles size={small ? 11 : 13} strokeWidth={1.5} aria-hidden="true" />
        AI
        <Info size={small ? 10 : 12} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
