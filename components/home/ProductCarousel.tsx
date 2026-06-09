"use client";

import { useRef, useState, useEffect } from "react";
import ProductCard from "@/components/ui/ProductCard";

const DURATION = 520;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type Product = {
  id: string; slug: string; name: string; category: string;
  price: number; images: string[]; stock: number;
};

// Dopasowane do sklep: px-6 (24px) padding, gap-6 (24px) odstęp
const PAD = 24;
const GAP = 24;

function getCardWidth(): number {
  return (window.innerWidth - 2 * PAD - GAP) / 2;
}

function targetOffset(index: number): number {
  return PAD - index * (getCardWidth() + GAP);
}

export default function ProductCarousel({ products }: { products: Product[] }) {
  const maxIndex = Math.max(0, products.length - 2);
  const [current, setCurrent] = useState(0);
  const innerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const currentOffset = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  function applyTranslate(x: number) {
    if (!innerRef.current) return;
    innerRef.current.style.transform = `translateX(${x}px)`;
    currentOffset.current = x;
  }

  function animateTo(index: number) {
    if (isAnimating.current) return;
    const clamped = Math.max(0, Math.min(maxIndex, index));
    const start = currentOffset.current;
    const end = targetOffset(clamped);
    const dist = end - start;
    if (Math.abs(dist) < 1) { setCurrent(clamped); return; }

    isAnimating.current = true;
    setCurrent(clamped);
    // Czas startu z timestampu rAF — bez wywołań performance.now() w ciele komponentu
    let t0: number | null = null;

    function step(now: number) {
      if (t0 === null) t0 = now;
      const t = Math.min((now - t0) / DURATION, 1);
      applyTranslate(start + dist * easeInOutSine(t));
      if (t < 1) requestAnimationFrame(step);
      else { applyTranslate(end); isAnimating.current = false; }
    }
    requestAnimationFrame(step);
  }

  useEffect(() => {
    applyTranslate(targetOffset(0));
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) < 30 || dy > Math.abs(dx) * 0.8) return;
    animateTo(dx > 0 ? current + 1 : current - 1);
  }

  const cardW = `calc((100vw - ${2 * PAD + GAP}px) / 2)`;

  return (
    <div
      className="overflow-hidden w-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={innerRef}
        className="flex will-change-transform"
        style={{ gap: `${GAP}px`, transform: "translateX(0)" }}
      >
        {products.map((product) => (
          <div key={product.id} style={{ flexShrink: 0, width: cardW }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {products.length > 2 && (
        <div className="flex justify-center gap-1.5 mt-5">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => animateTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "bg-clay scale-125" : "bg-sand"
              }`}
              aria-label={`Produkty ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
