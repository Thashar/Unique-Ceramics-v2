"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";

/** Poniżej tylu pikseli gest traktujemy jako drgnięcie palca, nie przesunięcie. */
const AXIS_LOCK_PX = 8;
/** Minimalne przesunięcie zmieniające zdjęcie – większe z tych dwóch wartości. */
const SWIPE_MIN_PX = 40;
const SWIPE_MIN_RATIO = 0.15;
/** Opór na krańcach taśmy – palec jedzie, ale wyraźnie wolniej. */
const EDGE_RESISTANCE = 3;

type Gesture = { x: number; y: number; axis: "none" | "x" | "y" };

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [activeImage, setActiveImage] = useState(0);
  // Przesunięcie taśmy w trakcie gestu (px). Null = palec nie dotyka zdjęcia.
  const [drag, setDrag] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  const hasMany = images.length > 1;

  const go = (dir: -1 | 1) => {
    setActiveImage((prev) => Math.min(images.length - 1, Math.max(0, prev + dir)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMany) return;
    const t = e.touches[0];
    gesture.current = { x: t.clientX, y: t.clientY, axis: "none" };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (!g) return;
    const t = e.touches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;

    // Kierunek ustalamy raz: pionowe przewijanie strony ma pierwszeństwo
    if (g.axis === "none") {
      if (Math.abs(dx) > AXIS_LOCK_PX && Math.abs(dx) > Math.abs(dy)) g.axis = "x";
      else if (Math.abs(dy) > AXIS_LOCK_PX) g.axis = "y";
      else return;
    }
    if (g.axis !== "x") return;

    // Na krańcach taśmy nie ma dokąd jechać – pokazujemy tylko opór
    const atEdge =
      (dx > 0 && activeImage === 0) || (dx < 0 && activeImage === images.length - 1);
    setDrag(atEdge ? dx / EDGE_RESISTANCE : dx);
  };

  const handleTouchEnd = () => {
    const g = gesture.current;
    gesture.current = null;
    const offset = drag ?? 0;
    setDrag(null);
    if (!g || g.axis !== "x") return;

    const width = frameRef.current?.clientWidth ?? 0;
    const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_MIN_RATIO);
    if (Math.abs(offset) < threshold) return;
    go(offset < 0 ? 1 : -1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!hasMany) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <div className="w-full h-full flex items-center justify-center">
          <ShoppingBag size={64} strokeWidth={1} className="text-sand" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={frameRef}
        className="relative aspect-[4/3] overflow-hidden bg-cream group"
        // pan-y: gest w pionie przewija stronę, w poziomie obsługujemy sami
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={hasMany ? 0 : -1}
        role={hasMany ? "group" : undefined}
        aria-roledescription={hasMany ? "karuzela" : undefined}
        aria-label={hasMany ? `Zdjęcia produktu ${name}` : undefined}
      >
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(calc(-${activeImage * 100}% + ${drag ?? 0}px), 0, 0)`,
            // W trakcie gestu taśma idzie za palcem, animujemy dopiero po puszczeniu
            transition: drag === null ? "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          }}
        >
          {images.map((img, i) => (
            <div key={i} className="relative h-full w-full flex-shrink-0">
              <Image
                src={img}
                alt={images.length > 1 ? `${name} – zdjęcie ${i + 1}` : name}
                fill
                priority={i === 0}
                // contain, nie cover – na karcie produktu ma być widoczne całe
                // zdjęcie, a nie wycinek; kadr 4/3 odpowiada proporcjom, w których
                // robiona jest większość zdjęć, więc pustego tła jest minimum
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {hasMany && (
          <>
            {/* Strzałki tylko na desktopie – na dotyku zdjęcia zmienia się gestem */}
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={activeImage === 0}
              aria-label="Poprzednie zdjęcie"
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center bg-warm-white/90 text-espresso shadow-sm transition-opacity hover:bg-warm-white disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={activeImage === images.length - 1}
              aria-label="Następne zdjęcie"
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center bg-warm-white/90 text-espresso shadow-sm transition-opacity hover:bg-warm-white disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronRight size={20} />
            </button>

            {/* Licznik – na dotyku nie widać miniatur przy dłuższej liście */}
            <span className="md:hidden absolute bottom-3 right-3 bg-espresso/80 text-cream text-xs px-2 py-1 tabular-nums">
              {activeImage + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {hasMany && (
        <div className="flex gap-3 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              aria-label={`Pokaż zdjęcie ${i + 1}`}
              aria-current={activeImage === i}
              className={`relative aspect-[4/3] w-24 overflow-hidden bg-cream flex-shrink-0 border-2 transition-colors ${
                activeImage === i ? "border-clay" : "border-transparent"
              }`}
            >
              <Image
                src={img}
                alt={`${name} ${i + 1}`}
                fill
                className="object-contain"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
