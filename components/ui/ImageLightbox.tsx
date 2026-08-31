"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, X } from "lucide-react";

/** Granice powiększenia w podglądzie. */
const MIN_SCALE = 1;
const MAX_SCALE = 4;
/** Powiększenie po podwójnym kliknięciu / dwukrotnym stuknięciu. */
const QUICK_ZOOM = 2.5;
/** Krok przycisków +/−. */
const ZOOM_STEP = 0.5;
/** Dwa stuknięcia bliżej niż tyle milisekund traktujemy jako podwójne. */
const DOUBLE_TAP_MS = 320;
/** Ruch palca poniżej tylu pikseli to stuknięcie, nie przesunięcie. */
const TAP_SLOP_PX = 10;
/** Minimalne przesunięcie zmieniające zdjęcie (tylko przy braku powiększenia). */
const SWIPE_MIN_PX = 60;

/** Powiększenie i przesunięcie – jeden stan, żeby zoom i pan liczyły się razem. */
type View = { s: number; x: number; y: number };
const RESET: View = { s: 1, x: 0, y: 0 };

/**
 * Czy jesteśmy już w przeglądarce – portal potrzebuje `document`.
 * Przez `useSyncExternalStore`, nie `setState` w efekcie (patrz CLAUDE.md).
 */
const noop = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}

/**
 * Podgląd zdjęcia produktu w osobnym oknie (lightbox) – zastąpił lupę
 * przesuwaną po kadrze.
 *
 * Działa tak samo na myszy i na dotyku: powiększenie kółkiem myszy, szczypaniem
 * dwoma palcami, przyciskami +/− i podwójnym kliknięciem albo stuknięciem,
 * a przy powiększeniu zdjęcie przesuwa się przeciąganiem. Bez powiększenia
 * poziomy gest zmienia zdjęcie.
 *
 * Renderowane **portalem do `body`** – `position: fixed` liczy się względem
 * najbliższego przodka z `transform`/`filter`, a galeria stoi w animowanych
 * sekcjach strony (ten sam powód co przy `CartToasts`).
 *
 * Źródłem jest **oryginalny plik**, nie wariant z `next/image` – tylko oryginał
 * ma dość pikseli na powiększenie 4x.
 */
export default function ImageLightbox({
  images,
  name,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  name: string;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const mounted = useMounted();
  const [view, setView] = useState<View>(RESET);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  /** Czy palec albo kursor trzyma zdjęcie – wtedy transform idzie bez animacji. */
  const [gesturing, setGesturing] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  /** Aktywne wskaźniki (palce albo kursor) – dwa naraz oznaczają szczypanie. */
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  /** Punkt startowy przeciągania, widok z tej chwili i czy gest zaczął się na tle. */
  const panFrom = useRef<{ px: number; py: number; view: View; backdrop: boolean } | null>(
    null
  );
  /** Rozstaw palców i widok z chwili rozpoczęcia szczypania. */
  const pinchFrom = useRef<{ dist: number; view: View } | null>(null);
  /** Czy gest przesunął palec na tyle, że nie jest już stuknięciem. */
  const moved = useRef(false);
  const lastTap = useRef(0);

  const hasMany = images.length > 1;
  const src = images[index];
  const zoomed = view.s > MIN_SCALE;

  /** Nie pozwala wyprowadzić zdjęcia poza widoczny obszar. */
  const clampView = useCallback((next: View): View => {
    const area = areaRef.current;
    const img = imgRef.current;
    if (!area || !img) return next;
    // Rozmiar zdjęcia przed powiększeniem – transform nie zmienia układu strony
    const maxX = Math.max(0, (img.offsetWidth * next.s - area.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * next.s - area.clientHeight) / 2);
    return {
      s: next.s,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  /**
   * Powiększa do zadanej wartości, zachowując pod kursorem (albo pod środkiem
   * szczypania) ten sam punkt zdjęcia. Bez tego zoom ucieka spod palca.
   */
  const zoomTo = useCallback(
    (next: number, clientX?: number, clientY?: number) => {
      setView((v) => {
        const area = areaRef.current;
        if (!area) return v;
        const rect = area.getBoundingClientRect();
        const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
        // Punkt zaczepienia liczony od środka obszaru – tam jest środek skalowania
        const cx = (clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2;
        const cy = (clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2;
        const k = s / v.s;
        return clampView({ s, x: cx - k * (cx - v.x), y: cy - k * (cy - v.y) });
      });
    },
    [clampView]
  );

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!hasMany) return;
      setView(RESET);
      onIndexChange((index + dir + images.length) % images.length);
    },
    [hasMany, images.length, index, onIndexChange]
  );

  // Klawiatura: Escape zamyka, strzałki zmieniają zdjęcie, +/− powiększają
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "+" || e.key === "=") zoomTo(view.s + ZOOM_STEP);
      else if (e.key === "-") zoomTo(view.s - ZOOM_STEP);
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go, onClose, zoomTo, view.s]);

  // Strona pod spodem nie może się przewijać, gdy podgląd jest otwarty
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Kółko myszy powiększa zamiast przewijać stronę. React podpina zdarzenie
  // `wheel` pasywnie, więc `preventDefault()` w `onWheel` nic by nie dał –
  // listener musi być dopięty ręcznie z `passive: false`.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        const rect = area.getBoundingClientRect();
        const s = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, v.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
        );
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const k = s / v.s;
        return clampView({ s, x: cx - k * (cx - v.x), y: cy - k * (cy - v.y) });
      });
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, [clampView]);

  /** Środek i rozstaw dwóch aktywnych palców. */
  const midpoint = () => {
    const list = [...pointers.current.values()];
    return {
      x: (list[0].x + list[1].x) / 2,
      y: (list[0].y + list[1].y) / 2,
      dist: Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Strzałki i przyciski mają działać normalnie, nie startować gestu
    if ((e.target as HTMLElement).closest("button")) return;
    // Przejęcie wskaźnika: bez tego kursor wyprowadzony poza obszar gubi
    // `pointerup`, a palec zostaje w mapie i kolejny gest wygląda na szczypanie
    const onBackdrop = e.target === e.currentTarget;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    setGesturing(true);

    if (pointers.current.size === 2) {
      panFrom.current = null;
      pinchFrom.current = { dist: midpoint().dist, view };
      return;
    }
    panFrom.current = { px: e.clientX, py: e.clientY, view, backdrop: onBackdrop };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Szczypanie dwoma palcami: skala z rozstawu, przesunięcie ze środka gestu
    if (pointers.current.size === 2 && pinchFrom.current) {
      moved.current = true;
      const start = pinchFrom.current;
      const area = areaRef.current;
      if (!area || start.dist === 0) return;
      const { x, y, dist } = midpoint();
      const rect = area.getBoundingClientRect();
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, start.view.s * (dist / start.dist)));
      const cx = x - rect.left - rect.width / 2;
      const cy = y - rect.top - rect.height / 2;
      const k = s / start.view.s;
      setView(clampView({ s, x: cx - k * (cx - start.view.x), y: cy - k * (cy - start.view.y) }));
      return;
    }

    const start = panFrom.current;
    if (!start) return;
    const dx = e.clientX - start.px;
    const dy = e.clientY - start.py;
    if (Math.abs(dx) > TAP_SLOP_PX || Math.abs(dy) > TAP_SLOP_PX) moved.current = true;
    // Bez powiększenia nie ma czego przesuwać – poziomy gest zmienia zdjęcie
    // dopiero po puszczeniu palca, więc tutaj pilnujemy samego stanu `moved`
    if (start.view.s <= MIN_SCALE) return;
    setView(clampView({ s: start.view.s, x: start.view.x + dx, y: start.view.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const start = panFrom.current;
    const wasPinching = pointers.current.size === 2;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchFrom.current = null;
    if (pointers.current.size > 0) {
      // Drugi palec został na ekranie – przepisz punkt zaczepienia przesuwania
      const [rest] = [...pointers.current.values()];
      panFrom.current = { px: rest.x, py: rest.y, view, backdrop: false };
      return;
    }
    panFrom.current = null;
    setGesturing(false);
    if (wasPinching || !start) return;

    const dx = e.clientX - start.px;
    const dy = e.clientY - start.py;

    // Stuknięcie: dwa pod rząd powiększają, pojedyncze w tło zamyka podgląd
    if (!moved.current) {
      const now = Date.now();
      const double = now - lastTap.current < DOUBLE_TAP_MS;
      lastTap.current = double ? 0 : now;
      if (double) zoomTo(view.s > MIN_SCALE ? MIN_SCALE : QUICK_ZOOM, e.clientX, e.clientY);
      // Przejęcie wskaźnika przekierowuje `e.target` na obszar, więc to,
      // czy stuknięcie padło obok zdjęcia, zapamiętujemy przy `pointerdown`
      else if (start.backdrop) onClose();
      return;
    }

    // Gest poziomy bez powiększenia = następne albo poprzednie zdjęcie
    if (start.view.s <= MIN_SCALE && Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Podgląd zdjęcia – ${name}`}
      className="fixed inset-0 z-[80] bg-espresso/95 flex flex-col"
    >
      {/* Górny pasek: licznik zdjęć, powiększanie, zamknięcie */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-cream">
        <span className="text-xs tracking-widest uppercase tabular-nums text-sand/70 truncate">
          {hasMany ? `${index + 1} / ${images.length}` : name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => zoomTo(view.s - ZOOM_STEP)}
            disabled={view.s <= MIN_SCALE}
            aria-label="Pomniejsz"
            className="w-10 h-10 flex items-center justify-center border border-sand/25 hover:bg-sand/10 transition-colors disabled:opacity-30"
          >
            <Minus size={18} />
          </button>
          <span className="text-xs tabular-nums text-sand/70 w-12 text-center">
            {Math.round(view.s * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomTo(view.s + ZOOM_STEP)}
            disabled={view.s >= MAX_SCALE}
            aria-label="Powiększ"
            className="w-10 h-10 flex items-center justify-center border border-sand/25 hover:bg-sand/10 transition-colors disabled:opacity-30"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij podgląd"
            className="w-10 h-10 flex items-center justify-center border border-sand/25 hover:bg-sand/10 transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Obszar zdjęcia – `touch-action: none`, bo gesty obsługujemy sami */}
      <div
        ref={areaRef}
        className="relative flex-1 overflow-hidden flex items-center justify-center select-none"
        style={{ touchAction: "none", WebkitTouchCallout: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {loadedSrc !== src && (
          <Loader2 className="absolute w-8 h-8 text-sand/60 animate-spin" aria-hidden="true" />
        )}
        {/* Oryginalny plik, nie wariant `next/image` – tylko on ma dość pikseli
            na powiększenie do 4x */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={hasMany ? `${name} – zdjęcie ${index + 1}` : name}
          draggable={false}
          onLoad={() => setLoadedSrc(src)}
          className={`max-w-full max-h-full object-contain ${
            zoomed ? "cursor-grab" : "cursor-zoom-in"
          } ${loadedSrc === src ? "opacity-100" : "opacity-0"}`}
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`,
            // W trakcie gestu zdjęcie ma iść za palcem, animujemy dopiero skoki
            transition: gesturing ? "none" : "transform 180ms ease-out",
          }}
        />

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Poprzednie zdjęcie"
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-espresso/70 text-cream border border-sand/25 hover:bg-espresso transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Następne zdjęcie"
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-espresso/70 text-cream border border-sand/25 hover:bg-espresso transition-colors"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      <p className="px-4 py-3 text-center text-[11px] text-sand/60">
        {zoomed
          ? "Przeciągnij, aby przesunąć zdjęcie"
          : "Powiększ kółkiem myszy, szczypaniem palcami, podwójnym kliknięciem lub przyciskami +/−"}
      </p>
    </div>,
    document.body
  );
}
