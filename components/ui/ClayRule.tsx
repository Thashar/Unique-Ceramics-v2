/**
 * Ozdobnik otwierający blok treści: mozaika kafelków szkliwa osadzona
 * w cienkiej kresce. Kafelki 10 px w kolorach gliny (terracotta / clay / sand)
 * z różnym kryciem — jak próbnik szkliw.
 *
 * Czysto dekoracyjny, więc `aria-hidden`. Synchroniczny i bez stanu, można
 * używać w komponentach serwerowych.
 */

// Krycie zróżnicowane celowo nieregularnie — równy rytm wyglądał jak wykres
const TILES = [
  "bg-terracotta",
  "bg-clay",
  "bg-sand",
  "bg-terracotta/55",
  "bg-clay/40",
  "bg-sand",
  "bg-terracotta/80",
  "bg-clay/65",
  "bg-sand/70",
  "bg-terracotta",
];

export default function ClayRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 ${className}`} aria-hidden="true">
      <span className="h-px w-7 shrink-0 bg-sand" />
      <span className="grid grid-cols-5 grid-rows-2 gap-[3px] shrink-0">
        {TILES.map((tile, i) => (
          <span key={i} className={`w-2.5 h-2.5 rounded-[1px] ${tile}`} />
        ))}
      </span>
      <span className="h-px flex-1 bg-sand" />
    </div>
  );
}
