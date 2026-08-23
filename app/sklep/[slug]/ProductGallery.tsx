"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import AiImageBadge from "@/components/ui/AiImageBadge";
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

/** Lupa: ile trzeba przytrzymać palcem, jak duże jest szkło i jak mocno powiększa. */
const HOLD_MS = 500;
const LENS_SIZE = 176;
const LENS_ZOOM = 2.6;

type Gesture = { x: number; y: number; axis: "none" | "x" | "y" };
/** Pozycja lupy w układzie kadru (px od lewej/górnej krawędzi). */
type Lens = { x: number; y: number };

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

  // Lupa: na myszy włącza ją kliknięcie w zdjęcie, na dotyku przytrzymanie;
  // potem jedzie za kursorem/palcem. W stanie trzymamy gotowy styl szkła, bo
  // wymiary kadru i zdjęcia czytamy z refów – a te wolno ruszać tylko
  // w zdarzeniach i efektach, nie przy renderze.
  const [lensStyle, setLensStyle] = useState<React.CSSProperties | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Wymiary źródłowe zdjęć – potrzebne, bo przy `object-contain` obraz nie
  // wypełnia kadru i tło lupy musi trafić dokładnie w to, co widać
  const naturalSize = useRef<Record<number, { w: number; h: number }>>({});

  // Tło szkła bierzemy z ORYGINAŁU zdjęcia, nie z wariantu wygenerowanego przez
  // `next/image` – tylko oryginał ma dość pikseli na powiększenie 2,6×. Ten plik
  // nie jest jednak wtedy w cache przeglądarki, więc szkło przez chwilę świeciło
  // pustym polem. Dlatego wczytujemy go w tle (kursor wchodzi na kadr / palec
  // dotyka zdjęcia), a lupę pokazujemy dopiero z gotowym zdjęciem.
  const loaded = useRef<Set<string>>(new Set());
  const loading = useRef<Map<string, Promise<void>>>(new Map());
  /** Punkt, w którym ma się pojawić lupa, gdy zdjęcie jeszcze się wczytuje. */
  const pending = useRef<Lens | null>(null);

  // Pasek miniatur: własny wskaźnik przewijania zamiast systemowego scrollbara.
  // Pokazuje się w trakcie przesuwania i gaśnie powoli po puszczeniu – tak samo
  // na dotyku i na myszy (zdarzenie `scroll` obsługuje oba przypadki).
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [thumbHint, setThumbHint] = useState({ visible: false, progress: 0, size: 1 });
  const thumbHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lensActive = lensStyle !== null;
  // Oznaczenie dotyczy całej galerii: wystarczy, że jedno ze zdjęć produktu
  // powstało z modelu – wtedy podpis jest widoczny niezależnie od tego, które
  // zdjęcie akurat oglądamy (nie miga przy przełączaniu)
  const aiImage = images.some(isAiGeneratedImage);
  const hasMany = images.length > 1;

  const preload = (src: string): Promise<void> => {
    if (loaded.current.has(src)) return Promise.resolve();
    const started = loading.current.get(src);
    if (started) return started;

    const task = new Promise<void>((resolve) => {
      const img = new window.Image();
      const done = () => {
        loaded.current.add(src);
        resolve();
      };
      // `decode()` czeka też na dekompresję – bez tego pierwsze malowanie szkła
      // potrafi jeszcze mrugnąć pustym polem
      img.onload = () => {
        if (img.decode) img.decode().catch(() => {}).finally(done);
        else done();
      };
      img.onerror = done; // przy błędzie nie ma na co czekać
      img.src = src;
    });
    loading.current.set(src, task);
    return task;
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  /** Punkt zdarzenia przeliczony na współrzędne wewnątrz kadru. */
  const framePoint = (clientX: number, clientY: number): Lens | null => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return {
      x: Math.min(rect.width, Math.max(0, clientX - rect.left)),
      y: Math.min(rect.height, Math.max(0, clientY - rect.top)),
    };
  };

  /** Styl szkła powiększającego dla aktualnego zdjęcia i punktu na kadrze. */
  const computeLensStyle = (clientX: number, clientY: number): React.CSSProperties | null => {
    const lens = framePoint(clientX, clientY);
    const rect = frameRef.current?.getBoundingClientRect();
    if (!lens || !rect) return null;

    const nat = naturalSize.current[activeImage];
    // Rozmiar i położenie zdjęcia w kadrze (tak jak liczy je `object-contain`)
    const scale = nat ? Math.min(rect.width / nat.w, rect.height / nat.h) : 1;
    const shownW = nat ? nat.w * scale : rect.width;
    const shownH = nat ? nat.h * scale : rect.height;
    const offsetX = (rect.width - shownW) / 2;
    const offsetY = (rect.height - shownH) / 2;

    const half = LENS_SIZE / 2;
    return {
      left: lens.x - half,
      top: lens.y - half,
      width: LENS_SIZE,
      height: LENS_SIZE,
      backgroundImage: `url(${images[activeImage]})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${shownW * LENS_ZOOM}px ${shownH * LENS_ZOOM}px`,
      backgroundPosition: `${-((lens.x - offsetX) * LENS_ZOOM - half)}px ${-((lens.y - offsetY) * LENS_ZOOM - half)}px`,
    };
  };

  /** Włącza lupę; gdy oryginał zdjęcia jeszcze się wczytuje – czeka na niego. */
  const showLens = (clientX: number, clientY: number) => {
    const src = images[activeImage];
    if (loaded.current.has(src)) {
      pending.current = null;
      setLensStyle(computeLensStyle(clientX, clientY));
      return;
    }
    // Lepiej pokazać szkło ułamek sekundy później niż na chwilę puste. Kursor
    // może się w tym czasie ruszyć – `pending` jest aktualizowane w ruchu myszy.
    pending.current = { x: clientX, y: clientY };
    void preload(src).then(() => {
      const point = pending.current;
      if (!point) return; // lupa w międzyczasie odwołana
      pending.current = null;
      setLensStyle(computeLensStyle(point.x, point.y));
    });
  };

  const armLens = (clientX: number, clientY: number) => {
    cancelHold();
    holdTimer.current = setTimeout(() => showLens(clientX, clientY), HOLD_MS);
  };

  const closeLens = () => {
    cancelHold();
    pending.current = null;
    setLensStyle(null);
  };

  // Gdy lupa jest aktywna, ruch palca ma ją przesuwać, a nie przewijać stronę.
  // React podpina `onTouchMove` jako pasywny, więc `preventDefault()` w nim nie
  // działa – listener musi być dopięty ręcznie z `passive: false`.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !lensActive) return;

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      setLensStyle(computeLensStyle(t.clientX, t.clientY));
    };

    frame.addEventListener("touchmove", onMove, { passive: false });
    return () => frame.removeEventListener("touchmove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lensActive, activeImage]);

  // Sprzątanie zegara przy odmontowaniu – inaczej lupa mogłaby się włączyć po wyjściu
  useEffect(() => cancelHold, []);

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

  const go = (dir: -1 | 1) => {
    // Zmiana zdjęcia zamyka lupę – inaczej szkło pokazywałoby poprzedni kadr
    closeLens();
    setActiveImage((prev) => Math.min(images.length - 1, Math.max(0, prev + dir)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    // Oryginał zaczyna się wczytywać już przy dotknięciu – przytrzymanie trwa pół
    // sekundy, więc szkło ma zwykle czym się wypełnić od razu
    void preload(images[activeImage]);
    // Lupa działa też przy jednym zdjęciu – przesuwanie taśmy tylko przy wielu
    armLens(t.clientX, t.clientY);
    if (!hasMany) return;
    gesture.current = { x: t.clientX, y: t.clientY, axis: "none" };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Przy aktywnej lupie ruchem zajmuje się listener z `passive: false`
    if (lensActive) return;
    const g = gesture.current;
    if (!g) return;
    const t = e.touches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;

    // Ruch palca to gest przewijania, nie przytrzymanie – odwołaj lupę
    if (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX) {
      cancelHold();
      pending.current = null;
    }

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
    const hadLens = lensActive;
    closeLens();
    const g = gesture.current;
    gesture.current = null;
    const offset = drag ?? 0;
    setDrag(null);
    // Po oglądaniu przez lupę nie przeskakujemy na sąsiednie zdjęcie
    if (hadLens || !g || g.axis !== "x") return;

    const width = frameRef.current?.clientWidth ?? 0;
    const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_MIN_RATIO);
    if (Math.abs(offset) < threshold) return;
    go(offset < 0 ? 1 : -1);
  };

  // Na myszy lupę włącza i wyłącza samo kliknięcie w zdjęcie. Na dotyku zostaje
  // przytrzymanie – tam kliknięcie kolidowałoby z przesuwaniem taśmy palcem,
  // dlatego warunek na `pointerType`.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    // Strzałki na kadrze mają zmieniać zdjęcie, a nie włączać lupę
    if ((e.target as HTMLElement).closest("button")) return;
    if (lensActive || pending.current) {
      closeLens();
      return;
    }
    showLens(e.clientX, e.clientY);
  };

  const handleMouseEnter = () => {
    // Wczytujemy oryginał, zanim padnie kliknięcie – szkło ma być gotowe od razu
    void preload(images[activeImage]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Czekamy na wczytanie zdjęcia – zapamiętaj, gdzie kursor jest teraz
    if (pending.current) {
      pending.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!lensActive) return;
    setLensStyle(computeLensStyle(e.clientX, e.clientY));
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
        className={`relative aspect-[4/3] overflow-hidden bg-cream group select-none ${
          lensActive ? "md:cursor-zoom-out" : "md:cursor-zoom-in"
        }`}
        // pan-y: gest w pionie przewija stronę, w poziomie obsługujemy sami
        style={{ touchAction: "pan-y", WebkitTouchCallout: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        // Kursor poza kadrem = koniec oglądania przez lupę
        onMouseLeave={closeLens}
        // Bez tego długie przytrzymanie otwiera menu przeglądarki („Otwórz grafikę
        // w nowej karcie…”), które zasłania kadr i przerywa gest lupy
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
                onLoad={(e) => {
                  const el = e.currentTarget;
                  naturalSize.current[i] = { w: el.naturalWidth, h: el.naturalHeight };
                }}
              />
            </div>
          ))}
        </div>

        {/* Lupa – kliknięcie kursorem, przytrzymanie palcem. Szkło nie ma własnego
            tła: pojawia się dopiero z wczytanym zdjęciem, więc nie ma czego zakrywać */}
        {lensStyle && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-sm border-2 border-warm-white shadow-xl"
            style={lensStyle}
          />
        )}

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
            ref={thumbsRef}
            onScroll={handleThumbsScroll}
            className="flex gap-3 overflow-x-auto no-scrollbar"
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  closeLens();
                  setActiveImage(i);
                }}
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

          {/* Wskaźnik przewijania: zapala się od razu, gaśnie powoli po
              puszczeniu. Przesunięcie i szerokość bez animacji – mają jechać
              razem z palcem, animujemy samą przezroczystość */}
          <div className="relative mt-2 h-0.5" aria-hidden="true">
            <div
              className="absolute inset-y-0 bg-clay rounded-full"
              style={{
                width: `${thumbHint.size * 100}%`,
                left: `${thumbHint.progress * (100 - thumbHint.size * 100)}%`,
                opacity: thumbHint.visible ? 1 : 0,
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
    </div>
  );
}
