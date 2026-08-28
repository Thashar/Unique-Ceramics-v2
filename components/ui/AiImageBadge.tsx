"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Info } from "lucide-react";

/**
 * Treść wyjaśnienia – ta sama wszędzie, gdzie pokazujemy znaczek.
 *
 * Mowa o **zdjęciach w liczbie mnogiej** – znaczek opisuje całą galerię produktu,
 * listę w katalogu albo sekcję na stronie głównej, a nie pojedynczy kadr.
 *
 * **Musi zgadzać się z regulaminem** (punkty I.5 i I.6): model zmienia wyłącznie
 * tło, scenerię, oświetlenie i kadr, sam produkt zostaje nienaruszony, a rekwizyty
 * ze zdjęcia nie wchodzą w skład zamówienia. Zmieniając jedno, popraw drugie –
 * rozjazd między znacznikiem a regulaminem działa na niekorzyść sklepu.
 */
export const AI_IMAGE_NOTICE =
  "Tło, sceneria i oświetlenie części zdjęć zostały przygotowane przy wsparciu AI. " +
  "Same produkty są odwzorowaniem rzeczywistych wyrobów – kształt, proporcje, liczba " +
  "sztuk i kolor szkliwa pozostają niezmienione. Elementy dekoracyjne widoczne na " +
  "zdjęciach nie wchodzą w skład zamówienia (patrz regulamin, pkt I.5 i I.6).";

/** Szerokość dymka i odstęp od znaczka (px). */
const TIP_WIDTH = 268;
const TIP_GAP = 8;
/** Poniżej tylu pikseli od górnej krawędzi dymek nie zmieści się nad znaczkiem. */
const TIP_FLIP_TOP = 140;

/** Wyliczona pozycja dymka w układzie okna (`position: fixed`). */
type TipPos = { top: number; left: number; width: number; below: boolean };

/** Rozmiary dopasowane do miejsca: karta produktu, kafelek listy, widok kompaktowy. */
const SIZES = {
  lg: { text: "text-[11px] md:text-xs", icon: "w-3.5 h-3.5", gap: "gap-1.5" },
  md: { text: "text-[10px]", icon: "w-3 h-3", gap: "gap-1" },
  sm: { text: "text-[9px]", icon: "w-2.5 h-2.5", gap: "gap-0.5" },
} as const;

/**
 * Oznaczenie „AI" na zdjęciu wygenerowanym przez model (sufiks `-ai.webp`).
 *
 * Stoi pod galerią jako dyskretny podpis – bez własnego tła, w kolorach
 * drobnych informacji na karcie produktu (ikony `clay`, tekst `charcoal/80`,
 * oba powyżej progu kontrastu AA na jasnym tle).
 *
 * Dymek z wyjaśnieniem idzie **portalem do `body`** (`position: fixed`, pozycja
 * liczona od znaczka) – w katalogu leży pod przyklejonym paskiem kategorii
 * i headerem, a te są w osobnych warstwach, więc `z-index` wewnątrz listy nic
 * by nie dał. Pojawia się po najechaniu kursorem, a na dotyku po
 * kliknięciu – dlatego całość jest przyciskiem, a nie samym napisem. Znaczek
 * bywa umieszczany w kadrze z gestami albo wewnątrz linku, więc zdarzenia
 * zatrzymujemy na nim: kliknięcie ma pokazać wyjaśnienie, a nie otworzyć
 * produktu ani podglądu zdjęcia.
 */
export default function AiImageBadge({
  size = "md",
  align = "left",
  notice = AI_IMAGE_NOTICE,
  className = "",
}: {
  size?: keyof typeof SIZES;
  /** Treść wyjaśnienia – domyślnie ta o zdjęciach produktów. */
  notice?: string;
  /** Z której krawędzi znaczka wyrasta dymek – przy prawym marginesie strony `right`. */
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<TipPos | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const s = SIZES[size];

  /**
   * Pozycja dymka liczona od znaczka. Dymek jedzie **portalem do `body`**
   * z `position: fixed`, bo w katalogu leży pod przyklejonym paskiem kategorii
   * (`z-30`) i headerem (`z-50`) – żadne `z-index` wewnątrz listy nie wyniosłoby
   * go nad nie. Trzyma się krawędzi okna: wychodząc poza ekran, przesuwa się
   * do środka, a przy górnej krawędzi rozwija w dół zamiast w górę.
   */
  const measure = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(TIP_WIDTH, window.innerWidth - 2 * TIP_GAP);
    const raw = align === "right" ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(TIP_GAP, raw),
      Math.max(TIP_GAP, window.innerWidth - width - TIP_GAP)
    );
    const below = rect.top < TIP_FLIP_TOP;
    setPos({
      top: below ? rect.bottom + TIP_GAP : rect.top - TIP_GAP,
      left,
      width,
      below,
    });
  };

  const show = () => {
    measure();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Znaczek jedzie ze stroną, dymek jest przypięty do okna – po przewinięciu
    // albo obróceniu ekranu trzeba go przeliczyć, inaczej zostałby w miejscu
    const onReflow = () => measure();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  return (
    <div ref={wrapperRef} className={`relative inline-flex ${className}`}>
      {open &&
        pos &&
        createPortal(
          <p
            role="tooltip"
            // z-[60] – wyżej niż przyklejony pasek kategorii (z-30) i header (z-50)
            className="fixed z-[60] bg-espresso text-cream text-[11px] leading-relaxed px-3 py-2.5 shadow-lg"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              transform: pos.below ? undefined : "translateY(-100%)",
            }}
          >
            {notice}
          </p>,
          document.body
        )}
      <button
        ref={buttonRef}
        type="button"
        // Karta produktu na liście jest linkiem, a kadr galerii ma gesty i otwiera
        // podgląd – bez zatrzymania zdarzeń kliknięcie w znaczek robiłoby coś innego
        // niż pokazanie wyjaśnienia
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) setOpen(false);
          else show();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        aria-label={notice}
        aria-expanded={open}
        className={`inline-flex items-center tracking-wider uppercase text-charcoal/80 hover:text-espresso transition-colors ${s.gap} ${s.text}`}
      >
        <Sparkles className={`${s.icon} text-clay`} strokeWidth={1.5} aria-hidden="true" />
        AI
        <Info className={`${s.icon} text-clay`} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
