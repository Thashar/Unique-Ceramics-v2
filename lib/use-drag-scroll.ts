"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Poniżej tylu pikseli ruch kursora jest kliknięciem, nie przeciągnięciem. */
const DRAG_THRESHOLD_PX = 8;
/** Wskaźnik gaśnie po tylu ms bez ruchu taśmy, przez tyle ms trwa zanikanie. */
const HINT_HIDE_MS = 600;
export const HINT_FADE_MS = 700;
/** Blokada kliknięcia po przeciągnięciu zdejmuje się sama po tym czasie. */
const CLICK_BLOCK_MS = 120;

export type DragScrollHint = {
  /** Czy wskaźnik ma być widoczny – zapala się tylko na czas ruchu taśmy. */
  visible: boolean;
  /** Położenie 0–1 i długość 0–1 suwaka względem toru. */
  progress: number;
  size: number;
};

/**
 * Poziomo przewijana taśma (miniatury produktu, karuzela podobnych produktów):
 * palec obsługuje przeglądarka natywnie, a **kursor przesuwa ją tak samo jak
 * palec** – wciśnięty lewy przycisk ciągnie zawartość, kółko myszy przewija,
 * a na krańcu taśmy ruch wraca do strony. Pod spodem można narysować wskaźnik
 * z `hint`; ma się pokazywać wyłącznie w trakcie przesuwania (decyzja
 * właściciela 31.08.2026 – żadnego stałego paska ani strzałek).
 *
 * Pomiar siedzi w callback refie z `ResizeObserver`, a nie w efekcie: musi się
 * powtarzać po każdej zmianie szerokości kontenera, a reguła
 * `react-hooks/set-state-in-effect` nie pozwala ustawiać stanu w `useEffect`.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hint, setHint] = useState<DragScrollHint>({ visible: false, progress: 0, size: 1 });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  /** Wywołaj z `onScroll` taśmy – zapala wskaźnik i ustawia go na pozycji. */
  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.scrollWidth - el.clientWidth;
    if (scrollable <= 1) return;
    setHint({
      visible: true,
      progress: Math.min(1, Math.max(0, el.scrollLeft / scrollable)),
      size: el.clientWidth / el.scrollWidth,
    });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(
      () => setHint((prev) => ({ ...prev, visible: false })),
      HINT_HIDE_MS
    );
  }, []);

  const attach = useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    if (!el) return;

    const measure = () => {
      const scrollable = el.scrollWidth - el.clientWidth;
      setHint((prev) => ({
        ...prev,
        size: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
        progress: scrollable > 1 ? Math.min(1, Math.max(0, el.scrollLeft / scrollable)) : 0,
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if (el.scrollWidth - el.clientWidth <= 1) return;
      dragging = true;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      moved = 0;
      // Bez tego przeciągnięcie startuje natywne przenoszenie obrazka
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startScroll - dx;
    };

    const blockClick = (clickEvent: Event) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
    };
    let unblockTimer: ReturnType<typeof setTimeout> | null = null;

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      // Przeciągnięcie nie może kończyć się kliknięciem w kafelek pod kursorem.
      // Blokadę zdejmujemy po chwili także wtedy, gdy kliknięcie nie przyszło
      // (kursor puszczony poza taśmą) – inaczej zjadłaby następny klik
      if (moved > DRAG_THRESHOLD_PX) {
        el.addEventListener("click", blockClick, { capture: true, once: true });
        if (unblockTimer) clearTimeout(unblockTimer);
        unblockTimer = setTimeout(
          () => el.removeEventListener("click", blockClick, { capture: true }),
          CLICK_BLOCK_MS
        );
      }
    };

    /**
     * Kółko myszy przewija taśmę w poziomie. Na krańcu **oddajemy ruch stronie**,
     * żeby przewijanie się na niej nie zatrzymywało. Listener dopinamy ręcznie,
     * bo React podpina `wheel` pasywnie, a tu potrzebny jest `preventDefault`.
     */
    const onWheel = (e: WheelEvent) => {
      const scrollable = el.scrollWidth - el.clientWidth;
      if (scrollable <= 1) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      const atStart = delta < 0 && el.scrollLeft <= 0;
      const atEnd = delta > 0 && el.scrollLeft >= scrollable - 1;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      observer.disconnect();
      if (unblockTimer) clearTimeout(unblockTimer);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("click", blockClick, { capture: true });
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return { ref, attach, onScroll, hint };
}

/** Klasy taśmy: schowany scrollbar, kursor „łapki”, bez zaznaczania tekstu. */
export const DRAG_SCROLL_CLASS =
  "overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing";
