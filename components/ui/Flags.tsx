/**
 * Flagi do przełącznika języka w nagłówku – własne SVG, żeby nie ciągnąć
 * kolejnej paczki ani emoji (te renderują się różnie na każdym systemie).
 * Zaokrąglone rogi i cienka jasna obwódka, żeby biała połowa polskiej flagi
 * nie znikała na jasnym tle.
 *
 * Rozmiar domyślny: **22 px wysokości** – tyle co ikony koszyka i konta
 * w nagłówku (`size={22}`), proporcje 3:2 dla obu flag (brytyjska jest 2:1,
 * więc `slice` przycina jej boki zamiast zostawiać pasy).
 */

const FRAME = "rounded-[3px] ring-1 ring-white/25 shrink-0";
export const FLAG_SIZE = "h-[22px] w-[33px]";

export function FlagPL({ className = FLAG_SIZE }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 14" aria-hidden="true" className={`${FRAME} ${className}`}>
      <rect width="21" height="7" fill="#FFFFFF" />
      <rect y="7" width="21" height="7" fill="#DC143C" />
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
    </svg>
  );
}
