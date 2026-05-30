"use client";

import { useEffect } from "react";

const DURATION = 950;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export default function HomeScrollSnap() {
  useEffect(() => {
    // Wyłącz automatyczne przywracanie pozycji scrolla przez przeglądarkę —
    // bez tego odświeżenie strony może przywrócić scroll do miejsca między
    // sekcjami zanim IntersectionObserver zdąży wykryć właściwą sekcję,
    // co powoduje że header błędnie pokazuje tło warm-white.
    history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });

    const html = document.documentElement;
    html.style.scrollBehavior = "auto";

    let isScrolling = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScrollY = 0;
    let touchIsVertical: boolean | null = null;

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
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartScrollY = window.scrollY;
      touchIsVertical = null;
    }

    function handleTouchMove(e: TouchEvent) {
      // Wykryj kierunek dotyku przy pierwszym ruchu
      if (touchIsVertical === null) {
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);
        if (dx > 5 || dy > 5) {
          touchIsVertical = dy >= dx;
        }
      }

      // Blokuj natywne pionowe przewijanie tylko na sekcjach pełnoekranowych
      if (touchIsVertical === true) {
        const sections = getSnapSections();
        const idx = getIndexByScrollY(sections, touchStartScrollY);
        if (!isTall(sections[idx])) {
          e.preventDefault();
        }
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const diffY = touchStartY - e.changedTouches[0].clientY;
      const diffX = Math.abs(touchStartX - e.changedTouches[0].clientX);

      // Ignoruj głównie poziome ruchy (karuzel)
      if (diffX > Math.abs(diffY) * 1.5) return;
      if (Math.abs(diffY) < 40) return;

      const sections = getSnapSections();
      const startIdx = getIndexByScrollY(sections, touchStartScrollY);
      const section = sections[startIdx];
      const sectionTop = getSectionTop(section);

      if (isTall(section)) {
        const sectionBottom = sectionTop + section.offsetHeight;
        const viewportBottom = window.scrollY + window.innerHeight;
        const atBottom = diffY > 0 && viewportBottom >= sectionBottom - 60;
        const atTop = diffY < 0 && window.scrollY <= sectionTop + 60;

        if ((atBottom || atTop) && !isScrolling) {
          const dir = diffY > 0 ? 1 : -1;
          const next = Math.max(0, Math.min(sections.length - 1, startIdx + dir));
          if (next !== startIdx) animateTo(getSectionTop(sections[next]));
        }
        return;
      }

      if (isScrolling) return;
      const dir = diffY > 0 ? 1 : -1;
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
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", handleResize);
      html.style.scrollBehavior = "";
      history.scrollRestoration = "auto";
    };
  }, []);

  return null;
}
