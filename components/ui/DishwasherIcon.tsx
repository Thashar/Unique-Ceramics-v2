/**
 * Ikona „można myć w zmywarce" – lucide nie ma takiego symbolu, a jest potrzebny
 * przy każdym produkcie.
 *
 * Rysunek: **naczynia w ociekaczu, obmywane strumieniem wody** (wzorzec wskazany
 * przez właściciela 24.08.2026) – talerz z widocznym kołnierzem i drugie naczynie
 * za nim, stojące w koszu, a nad nimi wachlarz kropel. Sklep sprzedaje ceramikę,
 * więc symbol mówi o naczyniach, nie o sprzęcie AGD.
 *
 * Trzyma się konwencji lucide (viewBox 24, `currentColor`, kreska 1,5,
 * zaokrąglone końce), żeby stał równo obok `Truck` i `Clock` na karcie produktu.
 * Krople to ścieżki zerowej długości z zaokrąglonym końcem – ich średnica równa
 * się grubości kreski, więc cała ikona skaluje się jednym parametrem. Wzorzec ma
 * ich około dwudziestu; tutaj jest ich dziesięć, bo przy 18 px gęstsza siatka
 * zlewa się w plamę.
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
      {/* Wachlarz kropel – od wierzchołka rozchodzi się na boki i w dół */}
      <path d="M12 2.5v.01" />
      <path d="M9.3 3.9v.01" />
      <path d="M14.7 3.9v.01" />
      <path d="M12 5.5v.01" />
      <path d="M6.6 5.7v.01" />
      <path d="M17.4 5.7v.01" />
      <path d="M9.5 7.2v.01" />
      <path d="M14.5 7.2v.01" />
      <path d="M3.9 8.6v.01" />
      <path d="M20.1 8.6v.01" />

      {/* Drugi talerz – wystaje zza pierwszego w prawo. Łuk musi być większy
          niż półokrąg (large-arc = 1), inaczej chowa się w obrysie pierwszego */}
      <path d="M13.2 12.6a4.2 4.2 0 1 1 0 7.8" />

      {/* Pierwszy talerz: obrys i kołnierz */}
      <circle cx="10.2" cy="16.5" r="5.4" />
      <circle cx="10.2" cy="16.5" r="3.2" />
    </svg>
  );
}
