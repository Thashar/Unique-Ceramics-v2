import { bestVariantUrl } from "@/lib/image-variants";

/**
 * Własny loader `next/image` (`images.loader: "custom"` w `next.config.ts`).
 *
 * Zastępuje **płatny optymalizator Vercela**: zamiast prosić `/_next/image`
 * o wyliczenie rozmiaru przy każdym wyświetleniu, wskazujemy gotowy plik
 * wygenerowany raz przy wgrywaniu zdjęcia (patrz `lib/image-variants.ts`).
 * Dla przeglądarki nic się nie zmienia – nadal dostaje `srcSet` i sama wybiera
 * wariant pasujący do ekranu; znika tylko koszt i limit po stronie platformy.
 *
 * Next woła loader raz na każdą szerokość z `deviceSizes`/`imageSizes`, więc obie
 * listy muszą się zgadzać z `IMAGE_VARIANT_WIDTHS` – inaczej `srcSet` wskazywałby
 * pliki, których nie ma.
 *
 * Zdjęcia spoza Storage (hero i logo z `public/`, podglądy w panelu) loader
 * przepuszcza bez zmian – nie mają wariantów i mają być serwowane jak dotąd.
 *
 * Funkcja musi zostać **czysta i synchroniczna**: Next uruchamia ją zarówno przy
 * renderze na serwerze, jak i w przeglądarce.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  return bestVariantUrl(src, width);
}
