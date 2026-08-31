"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ShoppingBag, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import AiImageBadge from "@/components/ui/AiImageBadge";
import ImageLightbox from "./ImageLightbox";
import { isAiGeneratedImage } from "@/lib/ai";

/** Poniżej tylu pikseli gest traktujemy jako drgnięcie palca, nie przesunięcie. */
const AXIS_LOCK_PX = 8;
/** Minimalne przesunięcie zmieniające zdjęcie – większe z tych dwóch wartości. */
const SWIPE_MIN_PX = 40;
const SWIPE_MIN_RATIO = 0.15;
/** Opór na krańcach taśmy – palec jedzie, ale wyraźnie wolniej. */
const EDGE_RESISTANCE = 3;

/** Ile miniatur ma się zmieścić w rzędzie na telefonie (odstęp `gap-3` = 0,75 rem). */
const THUMBS_PER_VIEW = 3;
const THUMBS_GAP_REM = 0.75;
/** Wskaźnik przewijania miniatur: po puszczeniu palca gaśnie powoli. */
const THUMB_HINT_HIDE_MS = 600;
const THUMB_HINT_FADE_MS = 700;

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
  // Podgląd w osobnym oknie – otwiera go kliknięcie albo stuknięcie w kadr
  const [zoomOpen, setZoomOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  // Pasek miniatur: własny wskaźnik przewijania zamiast systemowego scrollbara.
  // Gdy rząd miniatur nie mieści się w kolumnie, wskaźnik stoi pod nim **na stałe**
  // (przygaszony) – inaczej nic nie zdradzało, że dalej są kolejne zdjęcia.
  // W trakcie przesuwania rozjaśnia się i jedzie z palcem, potem wraca do spoczynku.
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [thumbHint, setThumbHint] = useState({ visible: false, progress: 0, size: 1 });
  const [thumbsScrollable, setThumbsScrollable] = useState(false);
  const thumbHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Pomiar taśmy miniatur: czy w ogóle da się ją przewinąć i jak długi ma być
   * wskaźnik. Siedzi w **callback ref** z `ResizeObserver`, a nie w efekcie –
   * pomiar musi się powtórzyć po każdej zmianie szerokości kolumny (obrót
   * telefonu, zmiana okna), a reguła `react-hooks/set-state-in-effect`
   * nie pozwala ustawiać stanu w `useEffect`.
   */
  const attachThumbs = useCallback((el: HTMLDivElement | null) => {
    thumbsRef.current = el;
    if (!el) {
      setThumbsScrollable(false);
      return;
    }
    const measure = () => {
      const scrollable = el.scrollWidth - el.clientWidth;
      setThumbsScrollable(scrollable > 1);
      setThumbHint((prev) => ({
        ...prev,
        size: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
        progress: scrollable > 1 ? Math.min(1, Math.max(0, el.scrollLeft / scrollable)) : 0,
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    /**
     * Kółko myszy nad miniaturami przesuwa je w poziomie – bez tego na
     * desktopie nie było jak sięgnąć po dalsze zdjęcia (poziomego scrolla
     * mysz sama nie daje). Na krańcu taśmy oddajemy ruch stronie, żeby
     * przewijanie nie zatrzymywało się na galerii. Listener dopinamy ręcznie,
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
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Oznaczenie dotyczy całej galerii: wystarczy, że jedno ze zdjęć produktu
  // powstało z modelu – wtedy podpis jest widoczny niezależnie od tego, które
  // zdjęcie akurat oglądamy (nie miga przy przełączaniu)
  const aiImage = images.some(isAiGeneratedImage);
  const hasMany = images.length > 1;

  /**
   * Wskaźnik przewijania miniatur. Zapala się przy każdym ruchu taśmy i gaśnie
   * po chwili bez ruchu – dzięki temu na telefonie nie ma stałego paska pod
   * miniaturami, a widać, że rząd da się przesunąć.
   */
  const handleThumbsScroll = () => {
    const el = thumbsRef.current;
    if (!el) return;
    const scrollable = el.scrollWidth - el.clientWidth;
    if (scrollable <= 1) return;
    setThumbHint({
      visible: true,
      progress: Math.min(1, Math.max(0, el.scrollLeft / scrollable)),
      size: el.clientWidth / el.scrollWidth,
    });
    if (thumbHintTimer.current) clearTimeout(thumbHintTimer.current);
    thumbHintTimer.current = setTimeout(
      () => setThumbHint((prev) => ({ ...prev, visible: false })),
      THUMB_HINT_HIDE_MS
    );
  };

  useEffect(
    () => () => {
      if (thumbHintTimer.current) clearTimeout(thumbHintTimer.current);
    },
    []
  );

  // Zmiana zdjęcia strzałkami albo gestem przewija taśmę do jego miniatury –
  // przy kilkunastu zdjęciach aktywna miniatura potrafiła zostać poza kadrem.
  // Liczymy `scrollLeft` sami zamiast `scrollIntoView`, żeby nigdy nie ruszyć
  // pionowego przewinięcia strony pod użytkownikiem
  useEffect(() => {
    const el = thumbsRef.current;
    const thumb = el?.children[activeImage] as HTMLElement | undefined;
    if (!el || !thumb) return;
    const right = thumb.offsetLeft + thumb.offsetWidth;
    if (thumb.offsetLeft < el.scrollLeft) {
      el.scrollTo({ left: thumb.offsetLeft, behavior: "smooth" });
    } else if (right > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: right - el.clientWidth, behavior: "smooth" });
    }
  }, [activeImage]);

  const go = (dir: -1 | 1) => {
    setActiveImage((prev) => Math.min(images.length - 1, Math.max(0, prev + dir)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    if (!hasMany) return;
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
        className="relative aspect-[4/3] overflow-hidden bg-cream group select-none"
        // pan-y: gest w pionie przewija stronę, w poziomie obsługujemy sami
        style={{ touchAction: "pan-y", WebkitTouchCallout: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        // Bez tego długie przytrzymanie otwiera menu przeglądarki („Otwórz grafikę
        // w nowej karcie…”), które zasłania kadr i przerywa gest przesuwania
        onContextMenu={(e) => e.preventDefault()}
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
                // zdjęcie, a nie wycinek. Kadr jest poziomy 4:3; materiał w innych
                // proporcjach dostaje pasy tła zamiast obcięcia
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Jedyne wejście do podglądu – kliknięcie w samo zdjęcie go nie otwiera
            (decyzja właściciela 28.08.2026), żeby nie kolidowało z gestami */}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Powiększ zdjęcie"
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-warm-white/85 text-espresso shadow-sm transition-colors hover:bg-warm-white cursor-zoom-in"
        >
          <Expand size={16} strokeWidth={1.5} />
        </button>

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
          </>
        )}

        {/* Licznik zdjęć – tylko na dotyku, na desktopie widać miniatury */}
        {hasMany && (
          <span className="md:hidden absolute bottom-3 right-3 bg-espresso/85 text-cream text-[11px] px-2 py-1 tabular-nums">
            {activeImage + 1} / {images.length}
          </span>
        )}
      </div>

      {hasMany && (
        <div>
          {/* Systemowy scrollbar chowamy (`no-scrollbar`) – jego miejsce zajmuje
              wskaźnik niżej, widoczny tylko w trakcie przesuwania */}
          <div
            ref={attachThumbs}
            onScroll={handleThumbsScroll}
            className="flex gap-3 overflow-x-auto no-scrollbar"
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                aria-label={`Pokaż zdjęcie ${i + 1}`}
                aria-current={activeImage === i}
                /* Na telefonie w rzędzie mieszczą się dokładnie trzy miniatury
                   na szerokość oglądanego zdjęcia – szerokość liczona z odstępu,
                   więc odstępy zostają równe. Na desktopie zostaje stałe 112 px */
                style={{
                  "--thumb-w": `calc((100% - ${(THUMBS_PER_VIEW - 1) * THUMBS_GAP_REM}rem) / ${THUMBS_PER_VIEW})`,
                } as React.CSSProperties}
                className={`relative aspect-[4/3] w-[var(--thumb-w)] md:w-28 overflow-hidden bg-cream flex-shrink-0 border-2 transition-colors ${
                  activeImage === i ? "border-clay" : "border-transparent"
                }`}
              >
                <Image
                  src={img}
                  alt={`${name} ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 767px) 33vw, 112px"
                />
              </button>
            ))}
          </div>

          {/* Wskaźnik przewijania: tor widoczny, dopóki rząd miniatur da się
              przesunąć, a suwak stoi na nim stale (przygaszony) i rozjaśnia się
              na czas ruchu. Przesunięcie i szerokość bez animacji – mają jechać
              razem z palcem, animujemy samą przezroczystość */}
          <div
            className={`relative mt-2 h-1 rounded-full transition-colors ${
              thumbsScrollable ? "bg-sand" : "bg-transparent"
            }`}
            aria-hidden="true"
          >
            <div
              className="absolute inset-y-0 bg-clay rounded-full"
              style={{
                width: `${thumbHint.size * 100}%`,
                left: `${thumbHint.progress * (100 - thumbHint.size * 100)}%`,
                opacity: thumbHint.visible ? 1 : thumbsScrollable ? 0.55 : 0,
                transition: thumbHint.visible
                  ? "opacity 120ms ease-out"
                  : `opacity ${THUMB_HINT_FADE_MS}ms ease-in`,
              }}
            />
          </div>
        </div>
      )}

      {/* Oznaczenie zdjęcia z AI – poza kadrem, pod miniaturami: na wąskim
          ekranie wypada dokładnie między wyborem zdjęć a kategorią produktu */}
      {aiImage && (
        <div className="flex">
          <AiImageBadge size="lg" />
        </div>
      )}

      {zoomOpen && (
        <ImageLightbox
          images={images}
          name={name}
          index={activeImage}
          onIndexChange={setActiveImage}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}
