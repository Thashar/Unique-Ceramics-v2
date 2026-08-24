/**
 * Ikona „można myć w zmywarce" – lucide nie ma takiego symbolu, a jest potrzebny
 * przy każdym produkcie.
 *
 * Rysunek: **dwa nachodzące talerze i krople wody** nad nimi. Sklep sprzedaje
 * ceramikę, więc symbol mówi o naczyniach, nie o sprzęcie AGD.
 *
 * ⚠️ **Talerze nie mają kołnierza (okręgu wewnątrz okręgu).** Wcześniejsza wersja
 * rysowała współśrodkowe okręgi oddalone o 2,2 jednostki – przy kresce 1,5 zostawało
 * między nimi 0,7 prześwitu, więc zlewały się w ciemną tarczę i ikona odstawała
 * czernią od `Truck` i `Clock` obok (zmierzone: 26,3 wobec 24,9 dla `Clock`
 * w realnym rozmiarze wyświetlania). Dwa **osobne, nachodzące** talerze dają
 * 22,9 – lekko poniżej sąsiadów – przy tej samej, lucide'owej kresce 1,5.
 * Nie wracaj do współśrodkowych okręgów.
 *
 * Konwencja lucide (viewBox 24, `currentColor`, kreska 1,5, zaokrąglone końce),
 * żeby ikona stała równo obok pozostałych. Krople to ścieżki zerowej długości
 * z zaokrąglonym końcem – ich średnica równa się grubości kreski, więc cała
 * ikona skaluje się jednym parametrem.
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
      {/* Krople wody – wachlarz rozchodzący się na boki i w dół */}
      <path d="M12 2.3v.01" />
      <path d="M8.8 3.5v.01" />
      <path d="M15.2 3.5v.01" />
      <path d="M12 5.2v.01" />
      <path d="M5.6 5.4v.01" />
      <path d="M18.4 5.4v.01" />
      <path d="M9.2 7v.01" />
      <path d="M14.8 7v.01" />

      {/* Przedni talerz */}
      <circle cx="9.6" cy="15.6" r="5.9" />
      {/* Tylny talerz – widoczny wyłącznie poza obrysem przedniego. Łuk musi być
          większy niż półokrąg (large-arc = 1), inaczej chowa się w przednim. */}
      <path d="M12.2 10.3A5.9 5.9 0 1 1 12.2 20.9" />
    </svg>
  );
}
