"use client";

import { useEffect } from "react";

const DURATION = 950;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export default function HomeScrollSnap() {
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollBehavior = "auto";

    let isScrolling = false;
    let touchStartY = 0;
    let touchStartScrollY = 0;

    function getSnapSections(): HTMLElement[] {
      return Array.from(document.querySelectorAll<HTMLElement>("[data-snap]"));
    }

    function getSectionTop(section: HTMLElement): number {
      return section.getBoundingClientRect().top + window.scrollY;
    }

    function getIndexByScrollY(sections: HTMLElement[], scrollY: number): number {
      let closest = 0;
      let minDist = Infinity;
      sections.forEach((s, i) => {
        const dist = Math.abs(scrollY - getSectionTop(s));
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      return closest;
    }

    function isTall(section: HTMLElement): boolean {
      return section.offsetHeight > window.innerHeight + 20;
    }

    function animateTo(targetY: number) {
      if (isScrolling) return;
      const startY = window.scrollY;
      if (Math.abs(startY - targetY) < 5) return;
      isScrolling = true;
      const startTime = performance.now();
      const distance = targetY - startY;

      function step(now: number) {
        const t = Math.min((now - startTime) / DURATION, 1);
        window.scrollTo({ top: startY + distance * easeInOutSine(t), behavior: "instant" });
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          window.scrollTo({ top: targetY, behavior: "instant" });
          isScrolling = false;
        }
      }
      requestAnimationFrame(step);
    }

    function handleWheel(e: WheelEvent) {
      const sections = getSnapSections();
      const idx = getIndexByScrollY(sections, window.scrollY);
      const section = sections[idx];
      const sectionTop = getSectionTop(section);

      // Sekcja wyższa niż viewport (np. Instagram+Stopka):
      // pozwól na naturalne przewijanie i snapuj tylko na granicy
      if (isTall(section)) {
        const sectionBottom = sectionTop + section.offsetHeight;
        const viewportBottom = window.scrollY + window.innerHeight;
        const atBottom = e.deltaY > 0 && viewportBottom >= sectionBottom - 20;
        const atTop = e.deltaY < 0 && window.scrollY <= sectionTop + 20;

        if (atBottom || atTop) {
          e.preventDefault();
          if (isScrolling) return;
          const dir = e.deltaY > 0 ? 1 : -1;
          const next = Math.max(0, Math.min(sections.length - 1, idx + dir));
          if (next !== idx) animateTo(getSectionTop(sections[next]));
        }
        return;
      }

      // Sekcja pełnoekranowa: zawsze przechwytuj i snapuj
      e.preventDefault();
      if (isScrolling) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(sections.length - 1, idx + dir));
      animateTo(getSectionTop(sections[next]));
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      if (isScrolling) return;
      const sections = getSnapSections();
      const idx = getIndexByScrollY(sections, window.scrollY);
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(0, Math.min(sections.length - 1, idx + dir));
      animateTo(getSectionTop(sections[next]));
    }

    function handleTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY;
      touchStartScrollY = window.scrollY;

      const sections = getSnapSections();
      const idx = getIndexByScrollY(sections, touchStartScrollY);
      // Dla sekcji pełnoekranowych blokuj natywne przewijanie
      if (!isTall(sections[idx])) {
        e.preventDefault();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diff) < 40) return;

      const sections = getSnapSections();
      // Identyfikuj sekcję na podstawie pozycji przy początku dotyku
      const startIdx = getIndexByScrollY(sections, touchStartScrollY);
      const section = sections[startIdx];
      const sectionTop = getSectionTop(section);

      if (isTall(section)) {
        // Sekcja wysoka: snapuj tylko na granicy
        const sectionBottom = sectionTop + section.offsetHeight;
        const viewportBottom = window.scrollY + window.innerHeight;
        const atBottom = diff > 0 && viewportBottom >= sectionBottom - 60;
        const atTop = diff < 0 && window.scrollY <= sectionTop + 60;

        if ((atBottom || atTop) && !isScrolling) {
          const dir = diff > 0 ? 1 : -1;
          const next = Math.max(0, Math.min(sections.length - 1, startIdx + dir));
          if (next !== startIdx) animateTo(getSectionTop(sections[next]));
        }
        return;
      }

      // Sekcja pełnoekranowa: natychmiast snapuj do następnej
      if (isScrolling) return;
      const dir = diff > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(sections.length - 1, startIdx + dir));
      animateTo(getSectionTop(sections[next]));
    }

    function handleResize() {
      if (isScrolling) return;
      const sections = getSnapSections();
      const idx = getIndexByScrollY(sections, window.scrollY);
      window.scrollTo({ top: getSectionTop(sections[idx]), behavior: "instant" });
    }

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", handleResize);
      html.style.scrollBehavior = "";
    };
  }, []);

  return null;
}
