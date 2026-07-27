"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryImage } from "@/lib/gallery";

interface Props {
  images: GalleryImage[];
  alt: string;
  /** Klasy kontenera – proporcje i zaokrąglenie ustala strona (np. "aspect-[3/4] rounded-sm") */
  className?: string;
  sizes?: string;
  /** Co ile ms zmienia się zdjęcie (0 = bez automatu) */
  intervalMs?: number;
  priority?: boolean;
}

// Zdjęcia z panelu są już raz skompresowane (WebP q82), więc domyślne q75 optymalizatora
// dokładało im artefaktów. Wartość musi być w `images.qualities` w next.config.ts.
const IMAGE_QUALITY = 90;

const SWIPE_MIN_PX = 40;
const SWIPE_RATIO = 0.15; // ułamek szerokości, po którym swipe zmienia zdjęcie
const TRANSITION_MS = 600;

/** Preferencja „ograniczone animacje” – bez setState w efekcie (reguła react-hooks). */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export default function ImageGallery({
  images,
  alt,
  className = "",
  sizes = "(max-width: 1024px) 100vw, 50vw",
  intervalMs = 5000,
  priority = false,
}: Props) {
  const count = images.length;
  const isSlider = count > 1;

  // Klony na obu końcach dają zapętlenie bez skoku w przeciwną stronę:
  // [ostatnie, 1, 2, …, n, pierwsze] – realne zdjęcia zajmują pozycje 1…n
  const slides = isSlider ? [images[count - 1], ...images, images[0]] : images;

  const [index, setIndex] = useState(isSlider ? 1 : 0);
  // Wyłącza przejście na czas przeskoku z klonu na realne zdjęcie
  const [instant, setInstant] = useState(false);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);
  const indexRef = useRef(isSlider ? 1 : 0);
  const commitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const axisRef = useRef<"none" | "x" | "y">("none");
  const movedRef = useRef(false);
  const reduced = usePrefersReducedMotion();

  // Indeks nigdy nie wyjeżdża poza taśmę – nawet gdyby korekta się spóźniła,
  // widać zawsze zdjęcie, a nie pusty kadr
  const lastSlide = slides.length - 1;
  const safeIndex = Math.min(Math.max(index, 0), lastSlide);
  const logical = isSlider ? ((safeIndex - 1) % count + count) % count : 0;

  const applyIndex = useCallback((value: number, withoutTransition: boolean) => {
    indexRef.current = value;
    setInstant(withoutTransition);
    setIndex(value);
  }, []);

  /**
   * Kończy przejście: zwalnia blokadę i sprowadza indeks z klonu na realne zdjęcie.
   * Idempotentne – może je wywołać zarówno `transitionend`, jak i zegar awaryjny.
   */
  const finish = useCallback(() => {
    if (commitRef.current) {
      clearTimeout(commitRef.current);
      commitRef.current = null;
    }
    animatingRef.current = false;
    const i = indexRef.current;
    if (i <= 0) applyIndex(count, true);
    else if (i >= count + 1) applyIndex(1, true);
  }, [applyIndex, count]);

  const start = useCallback((target: number) => {
    animatingRef.current = true;
    applyIndex(target, false);
    // Nie polegamy wyłącznie na `transitionend` – gdy animacja zostanie przerwana
    // albo karta jest w tle, zdarzenie nie przychodzi i taśma zatrzymałaby się na klonie
    if (commitRef.current) clearTimeout(commitRef.current);
    commitRef.current = setTimeout(finish, TRANSITION_MS + 60);
  }, [applyIndex, finish]);

  const go = useCallback((dir: 1 | -1) => {
    if (!isSlider || animatingRef.current) return;
    start(indexRef.current + dir);
  }, [isSlider, start]);

  const goTo = useCallback((target: number) => {
    if (!isSlider || animatingRef.current || target === logical) return;
    start(target + 1);
  }, [isSlider, start, logical]);

  useEffect(() => () => {
    if (commitRef.current) clearTimeout(commitRef.current);
  }, []);

  // Automatyczne przewijanie w lewo – zatrzymane przy hoverze, dotyku,
  // poza widocznym obszarem i przy „ograniczonych animacjach”
  useEffect(() => {
    if (!isSlider || reduced || paused || dragging || !visible || intervalMs <= 0) return;
    const id = setTimeout(() => go(1), intervalMs);
    return () => clearTimeout(id);
  }, [isSlider, reduced, paused, dragging, visible, intervalMs, index, go]);

  // Nie animuj, gdy galeria jest poza ekranem (oszczędza pracę na mobile)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isSlider) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isSlider]);

  // Po przeskoku na klon przywróć przejścia dopiero w kolejnej klatce –
  // inaczej powrót na realne zdjęcie zostałby zanimowany przez całą taśmę
  useEffect(() => {
    if (!instant) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setInstant(false));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [instant]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== "transform" || e.target !== e.currentTarget) return;
    finish();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isSlider || animatingRef.current) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    axisRef.current = "none";
    movedRef.current = false;
    setDragging(true);
    setPaused(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;
    // Kierunek gestu ustalamy raz – pionowe przewijanie strony ma pierwszeństwo
    if (axisRef.current === "none") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisRef.current === "y") {
        setDragging(false);
        setDragPx(0);
        setPaused(false);
        return;
      }
    }
    movedRef.current = true;
    setDragPx(dx);
  };

  const onTouchEnd = () => {
    if (!dragging) return;
    const width = containerRef.current?.offsetWidth ?? 0;
    const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_RATIO);
    const dx = dragPx;
    setDragging(false);
    setDragPx(0);
    setPaused(false);
    if (Math.abs(dx) > threshold) go(dx > 0 ? -1 : 1);
  };

  const onClick = () => {
    // Po swipie przeglądarka potrafi dorzucić kliknięcie – ignorujemy je
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    go(1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isSlider) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };

  if (count === 0) return null;

  if (!isSlider) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={images[0].url}
          alt={alt}
          fill
          priority={priority}
          quality={IMAGE_QUALITY}
          className="object-cover"
          style={{ objectPosition: images[0].position }}
          sizes={sizes}
        />
      </div>
    );
  }

  const transform = `translate3d(calc(${-safeIndex * 100}% + ${dragPx}px), 0, 0)`;
  const animate = !instant && !dragging;

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 ${className}`}
      role="group"
      aria-roledescription="Galeria zdjęć"
      aria-label={alt}
      tabIndex={0}
      onClick={onClick}
      onMouseDown={() => { movedRef.current = false; }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={`flex h-full w-full ${animate ? "transition-transform duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]" : ""}`}
        style={{ transform }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((img, i) => (
          <div key={`${i}-${img.url}`} className="relative h-full w-full shrink-0 basis-full">
            <Image
              src={img.url}
              alt=""
              fill
              priority={priority && i === 1}
              quality={IMAGE_QUALITY}
              className="object-cover"
              style={{ objectPosition: img.position }}
              sizes={sizes}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Strzałki – tylko przy wskaźniku myszy, na dotyku wystarczy swipe */}
      <button
        type="button"
        aria-label="Poprzednie zdjęcie"
        onClick={(e) => { e.stopPropagation(); go(-1); }}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-espresso/70 text-cream opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-espresso transition-opacity"
      >
        <ChevronLeft size={18} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-label="Następne zdjęcie"
        onClick={(e) => { e.stopPropagation(); go(1); }}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-espresso/70 text-cream opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-espresso transition-opacity"
      >
        <ChevronRight size={18} strokeWidth={1.5} />
      </button>

      {/* Kropki na przyciemnionym pasku – kontrast elementów sterujących */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 pt-10 pb-4 bg-gradient-to-t from-espresso/70 to-transparent">
        {images.map((img, i) => (
          <button
            key={`${i}-${img.url}`}
            type="button"
            aria-label={`Zdjęcie ${i + 1} z ${count}`}
            aria-current={i === logical}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className={`h-1.5 rounded-full transition-all ${
              i === logical ? "w-6 bg-cream" : "w-1.5 bg-cream/60 hover:bg-cream"
            }`}
          />
        ))}
      </div>

      <span className="sr-only" aria-live="polite">
        Zdjęcie {logical + 1} z {count}
      </span>
    </div>
  );
}
