"use client";

import { useRef, useState, useEffect } from "react";
import ProductCard from "@/components/ui/ProductCard";

const DURATION = 520;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type Product = {
  id: string; slug: string; name: string; category: string;
  price: number; images: string[]; stock: number;
};

const CARD_VW = 0.40; // 40vw
const GAP = 20;       // gap-5

export default function ProductCarousel({ products }: { products: Product[] }) {
  const [current, setCurrent] = useState(0);
  const innerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const currentOffset = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  function targetOffset(index: number): number {
    const vw = window.innerWidth;
    const cardW = vw * CARD_VW;
    return -(index * (cardW + GAP)) + (vw - cardW) / 2;
  }

  function applyTranslate(x: number) {
    if (!innerRef.current) return;
    innerRef.current.style.transform = `translateX(${x}px)`;
    currentOffset.current = x;
  }

  function animateTo(index: number) {
    if (isAnimating.current) return;
    if (index < 0 || index >= products.length) return;

    const start = currentOffset.current;
    const end = targetOffset(index);
    const dist = end - start;
    if (Math.abs(dist) < 1) { setCurrent(index); return; }

    isAnimating.current = true;
    setCurrent(index);
    const t0 = performance.now();

    function step(now: number) {
      const t = Math.min((now - t0) / DURATION, 1);
      applyTranslate(start + dist * easeInOutSine(t));
      if (t < 1) requestAnimationFrame(step);
      else { applyTranslate(end); isAnimating.current = false; }
    }
    requestAnimationFrame(step);
  }

  // Ustaw pozycję startową po mount (zależy od window.innerWidth)
  useEffect(() => {
    applyTranslate(targetOffset(0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div
      className="overflow-hidden w-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Wewnętrzny pasek z kartami — przesuwany przez translateX */}
      <div
        ref={innerRef}
        className="flex will-change-transform"
        style={{ gap: `${GAP}px`, transform: "translateX(0)" }}
      >
        {products.map((product) => (
          <div key={product.id} className="flex-none w-[40vw]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Wskaźnik kropkowy */}
      {products.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-5">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => animateTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "bg-clay scale-125" : "bg-sand"
              }`}
              aria-label={`Produkt ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
