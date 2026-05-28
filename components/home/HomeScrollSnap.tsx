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

    function getSnapSections(): HTMLElement[] {
      return Array.from(document.querySelectorAll<HTMLElement>("[data-snap]"));
    }

    function getSectionTop(section: HTMLElement): number {
      return section.getBoundingClientRect().top + window.scrollY;
    }

    function getCurrentSectionIndex(sections: HTMLElement[]): number {
      const scrollY = window.scrollY;
      let closest = 0;
      let minDist = Infinity;
      sections.forEach((section, i) => {
        const dist = Math.abs(scrollY - getSectionTop(section));
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      return closest;
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
      e.preventDefault();
      if (isScrolling) return;
      const sections = getSnapSections();
      const idx = getCurrentSectionIndex(sections);
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(sections.length - 1, idx + dir));
      animateTo(getSectionTop(sections[next]));
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      if (isScrolling) return;
      const sections = getSnapSections();
      const idx = getCurrentSectionIndex(sections);
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(0, Math.min(sections.length - 1, idx + dir));
      animateTo(getSectionTop(sections[next]));
    }

    function handleTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e: TouchEvent) {
      if (isScrolling) return;
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(diff) < 40) return;
      const sections = getSnapSections();
      const idx = getCurrentSectionIndex(sections);
      const dir = diff > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(sections.length - 1, idx + dir));
      animateTo(getSectionTop(sections[next]));
    }

    function handleResize() {
      if (isScrolling) return;
      const sections = getSnapSections();
      const idx = getCurrentSectionIndex(sections);
      window.scrollTo({ top: getSectionTop(sections[idx]), behavior: "instant" });
    }

    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
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
