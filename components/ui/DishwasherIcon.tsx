/**
 * Ikona „można myć w zmywarce" – lucide nie ma zmywarki, a symbol jest potrzebny
 * przy każdym produkcie. Rysunek trzyma się konwencji reszty ikon w sklepie
 * (viewBox 24, `currentColor`, kreska 1,5, zaokrąglone końce), żeby stał równo
 * obok `Truck` i `Clock` na karcie produktu.
 */
export default function DishwasherIcon({
  size = 20,
  strokeWidth = 1.5,
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* obudowa i panel sterowania */}
      <rect x="3.5" y="2.5" width="17" height="19" rx="2" />
      <path d="M3.5 7.5h17" />
      <circle cx="17.5" cy="5" r="0.5" fill="currentColor" stroke="none" />
      {/* kropla wody w komorze – znak mycia */}
      <path d="M12 10.5c2.1 2 3.2 3.6 3.2 4.9a3.2 3.2 0 0 1-6.4 0c0-1.3 1.1-2.9 3.2-4.9z" />
    </svg>
  );
}
