/**
 * Flagi do przełącznika języka w nagłówku – własne SVG, żeby nie ciągnąć
 * kolejnej paczki ani emoji (te renderują się różnie na każdym systemie).
 * Zaokrąglone rogi i cienka jasna obwódka, żeby biała połowa polskiej flagi
 * nie znikała na jasnym tle.
 *
 * Rozmiar domyślny: **18 px wysokości** – trochę mniej niż ikony koszyka
 * i konta (22 px), bo pełny prostokąt koloru waży optycznie więcej niż
 * kreskowa ikona (decyzja właściciela 17.09.2026: „nie za duża, nie za mała”).
 * Proporcje 3:2 dla obu flag (brytyjska jest 2:1, więc `slice` przycina jej
 * boki zamiast zostawiać pasy).
 *
 * Na wierzchu leży **maska w kolorze `espresso`** – jak na zdjęciach hero,
 * tylko odrobinę lżejsza (40% zamiast 55%): pełne, nasycone kolory flag
 * wyskakiwały z ciemnego nagłówka, a przygaszone siedzą w nim jak reszta ikon
 * (decyzja właściciela 17.09.2026). `Tint` jest ostatnim elementem SVG, więc
 * obejmuje cały rysunek.
 */

const FRAME = "rounded-[3px] ring-1 ring-white/25 shrink-0";
export const FLAG_SIZE = "h-[18px] w-[27px]";

/** Kolor maski jak na zdjęciu hero; krycie **trochę niższe** niż tamte 55% (decyzja właściciela 17.09.2026). */
const TINT = "#2C2825";
const TINT_OPACITY = 0.4;

function Tint({ width, height }: { width: number; height: number }) {
  return <rect width={width} height={height} fill={TINT} fillOpacity={TINT_OPACITY} />;
}

export function FlagPL({ className = FLAG_SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 14" aria-hidden="true" className={`${FRAME} ${className}`}>
      <rect width="21" height="7" fill="#FFFFFF" />
      <rect y="7" width="21" height="7" fill="#DC143C" />
      <Tint width={21} height={14} />
    </svg>
  );
}

export function FlagGB({ className = FLAG_SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={`${FRAME} ${className}`}>
      {/* Bez clipPath z id – flaga bywa na stronie dwa razy (pasek + dymek),
          a SVG i tak przycina rysunek do viewBox */}
      <g>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
        <path d="M30,0 V30 M0,15 H60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
      <Tint width={60} height={30} />
    </svg>
  );
}
