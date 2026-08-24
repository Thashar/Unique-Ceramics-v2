/**
 * Ikona „można myć w zmywarce" – lucide nie ma takiego symbolu, a jest potrzebny
 * przy każdym produkcie.
 *
 * Rysunek przedstawia **talerz z tryskającą na niego wodą**, a nie obudowę
 * zmywarki (decyzja właściciela 24.08.2026): sklep sprzedaje ceramikę, więc
 * symbol ma mówić o naczyniu, nie o sprzęcie AGD. Trzyma się konwencji reszty
 * ikon (viewBox 24, `currentColor`, kreska 1,5, zaokrąglone końce), żeby stał
 * równo obok `Truck` i `Clock` na karcie produktu.
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
      {/* strumienie wody padające ukośnie na talerz */}
      <path d="M6 3.5 4.6 6.2" />
      <path d="M10.4 2.8 9.2 5.4" />
      <path d="M15 3.5l-1.1 2.4" />
      <path d="M19.2 5.2 17.9 7.2" />
      {/* krople */}
      <path d="M7.6 9.1v.01" />
      <path d="M12.2 8.4v.01" />
      <path d="M16.6 9.4v.01" />
      {/* talerz widziany z boku: kołnierz i czasza */}
      <path d="M2.8 13.2h18.4" />
      <path d="M20.6 13.2a8.6 8.6 0 0 1-17.2 0" />
    </svg>
  );
}
