"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";

const DURATION = 520;
const GAP = 32; // gap-8
const PER_PAGE = 4;

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type Product = {
  id: string; slug: string; name: string; category: string;
  price: number; images: string[]; stock: number;
};

export default function DesktopCarousel({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const isAnimating = useRef(false);
  const currentOffset = useRef(0);

  const totalPages = Math.ceil(products.length / PER_PAGE);
  const canNav = products.length > PER_PAGE;

  function getCardWidth(): number {
    return containerRef.current
      ? (containerRef.current.offsetWidth - (PER_PAGE - 1) * GAP) / PER_PAGE
      : 0;
  }

  function applyTranslate(x: number) {
    if (!innerRef.current) return;
    innerRef.current.style.transform = `translateX(${x}px)`;
    currentOffset.current = x;
  }

  function animateTo(pageIndex: number) {
    if (isAnimating.current) return;
    const clamped = Math.max(0, Math.min(totalPages - 1, pageIndex));
    const cw = getCardWidth();
    const start = currentOffset.current;
    const end = -clamped * PER_PAGE * (cw + GAP);
    if (Math.abs(end - start) < 1) { setPage(clamped); return; }
    isAnimating.current = true;
    setPage(clamped);
    let t0: number | null = null;
    const dist = end - start;
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
    applyTranslate(0);
    function handleResize() { setPage(0); applyTranslate(0); }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const cardW = `calc((100% - ${(PER_PAGE - 1) * GAP}px) / ${PER_PAGE})`;

  return (
    <div ref={containerRef} className="w-full">
      <div className="overflow-hidden">
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
      </div>

      {canNav && (
        <div className="flex items-center justify-center gap-5 mt-8">
          <button
            onClick={() => animateTo(page - 1)}
            disabled={page === 0}
            className="w-9 h-9 flex items-center justify-center border border-sand text-charcoal/50 hover:border-clay hover:text-clay disabled:opacity-25 disabled:cursor-default transition-colors"
            aria-label="Poprzednia strona"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => animateTo(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === page ? "bg-clay scale-125" : "bg-sand hover:bg-clay/40"
                }`}
                aria-label={`Strona ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => animateTo(page + 1)}
            disabled={page === totalPages - 1}
            className="w-9 h-9 flex items-center justify-center border border-sand text-charcoal/50 hover:border-clay hover:text-clay disabled:opacity-25 disabled:cursor-default transition-colors"
            aria-label="Następna strona"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
