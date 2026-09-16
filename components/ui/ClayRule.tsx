/**
 * Ozdobnik otwierający blok treści: mozaika kafelków szkliwa osadzona
 * w cienkiej kresce. Kafelki 10 px w kolorach gliny (terracotta / clay / sand)
 * z różnym kryciem – jak próbnik szkliw.
 *
 * Czysto dekoracyjny, więc `aria-hidden`. Synchroniczny i bez stanu, można
 * używać w komponentach serwerowych.
 */

// 9 kolumn × 2 rzędy. Krycie zróżnicowane celowo nieregularnie – równy rytm
// wyglądał jak wykres. Kolejność: najpierw cały górny rząd, potem dolny.
const COLUMNS = 9;
const TILES = [
  // górny rząd
  "bg-terracotta",
  "bg-clay",
  "bg-sand",
  "bg-terracotta/55",
  "bg-clay/40",
  "bg-sand/80",
  "bg-terracotta/75",
  "bg-clay/55",
  "bg-sand",
  // dolny rząd
  "bg-sand",
  "bg-terracotta/80",
  "bg-clay/65",
  "bg-sand/70",
  "bg-terracotta",
  "bg-clay/45",
  "bg-sand/85",
  "bg-terracotta/60",
  "bg-clay",
];

/**
 * `align="left"` – otwiera blok treści wyrównany do lewej (wprowadzenia, kolumny tekstu).
 * `align="center"` – mozaika pośrodku, z kreskami po obu stronach; do sekcji
 * z wyśrodkowanym nagłówkiem. Szerokość kresek ogranicz przez `className`
 * (np. `max-w-[220px] mx-auto`), inaczej ciągną się przez całą sekcję.
 *
 * `children` – treść wstawiona **na linię**, między mozaikę a kreskę (np. `h1`
 * „Sklep” w katalogu): nagłówek przerywa ozdobną kreskę zamiast stać pod nią.
 * Wtedy `aria-hidden` dostają tylko elementy dekoracyjne, nie cały wrapper.
 */
export default function ClayRule({
  className = "",
  align = "left",
  children,
}: {
  className?: string;
  align?: "left" | "center";
  children?: React.ReactNode;
}) {
  const centered = align === "center";
  const decorative = children ? { "aria-hidden": true as const } : {};
  return (
    <div className={`flex items-center gap-3.5 ${className}`} {...(children ? {} : { "aria-hidden": true })}>
      <span className={`h-px bg-sand ${centered ? "flex-1" : "w-7 shrink-0"}`} {...decorative} />
      <span
        className="grid grid-rows-2 gap-[3px] shrink-0"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, 0.625rem)` }}
        {...decorative}
      >
        {TILES.map((tile, i) => (
          <span key={i} className={`w-2.5 h-2.5 rounded-[1px] ${tile}`} />
        ))}
      </span>
      {children && (
        <>
          {/* Kawałek kreski między mozaiką a treścią – tekst nie ma się kleić do kafelków */}
          <span className="h-px w-7 shrink-0 bg-sand" {...decorative} />
          <span className="shrink-0 min-w-0">{children}</span>
        </>
      )}
      <span className="h-px flex-1 bg-sand" {...decorative} />
    </div>
  );
}
