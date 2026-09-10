/**
 * Warianty rozmiarowe zdjęć w Supabase Storage.
 *
 * Sklep **nie korzysta z optymalizatora obrazów Vercela** – jego limit
 * (5 000 transformacji miesięcznie w planie Hobby) był wyczerpywany w kilka dni,
 * bo Storage odpowiada nagłówkiem `cache-control: no-cache`, a wtedy Next
 * przelicza każdy wariant od nowa co `minimumCacheTTL` (domyślnie 4 godziny).
 * Po przekroczeniu limitu `/_next/image` odpowiada `402` i zamiast zdjęcia widać
 * tekst `alt` – tak właśnie zniknęły miniatury na karcie produktu (09.09.2026).
 *
 * Zamiast liczyć te same rozmiary w kółko, **generujemy je raz, przy wgrywaniu
 * zdjęcia** (`sharp` jest już na trasach admina) i zapisujemy obok oryginału.
 * `next/image` dostaje je przez własny loader (`lib/image-loader.ts`), więc
 * przeglądarka nadal sama wybiera właściwy rozmiar z `srcSet` – tylko praca
 * dzieje się raz na zdjęcie, a nie przy każdym wyświetleniu.
 *
 * Moduł jest **neutralny** (bez `sharp`, bez bazy, bez Storage) – korzysta z niego
 * loader po stronie klienta, trasy admina i skrypt migracyjny.
 */

/**
 * Szerokości generowane dla każdego zdjęcia. Dobrane pod realne użycia w sklepie:
 * 400 – miniatury galerii (112 px) i kafelki katalogu w widoku kompaktowym,
 * 800 – kafelki katalogu i galerie treściowe (576 px przy DPR 1–2),
 * 1600 – zdjęcie na karcie produktu (100vw na telefonie, 50vw na desktopie).
 * Powyżej 1600 px oddajemy oryginał (upload przycina go do 1920 px).
 *
 * **Ta lista musi zgadzać się z `deviceSizes`/`imageSizes` w `next.config.ts`** –
 * Next buduje `srcSet` z tamtych wartości i dla każdej woła loader. Szerokość
 * spoza listy dostałaby najbliższy większy wariant, czyli niepotrzebnie duży plik.
 * Dokładając rozmiar, przegeneruj też zdjęcia już wgrane
 * (`npx tsx scripts/generate-image-variants.ts`).
 */
export const IMAGE_VARIANT_WIDTHS = [400, 800, 1600] as const;

/** Największy wariant – powyżej tej szerokości serwujemy oryginał. */
export const MAX_VARIANT_WIDTH = IMAGE_VARIANT_WIDTHS[IMAGE_VARIANT_WIDTHS.length - 1];

/** Szerokość, do której upload przycina oryginał. */
export const ORIGINAL_MAX_WIDTH = 1920;

/** Bucket Storage ze zdjęciami. */
export const STORAGE_BUCKET = "products";

/** Fragment adresu publicznego pliku w naszym Storage. */
const PUBLIC_PREFIX = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

/**
 * Zdjęcia w `public/images/` **bezpośrednio** – hero, „O mnie", warsztaty, logo
 * i wordmark. Ich warianty leżą w repozytorium obok oryginałów (generuje je ten sam
 * skrypt migracyjny). Podkatalog `products/` jest celowo poza wzorcem: te pliki są
 * pozostałością sprzed przeniesienia katalogu do Storage, nikt ich już nie renderuje
 * i wariantów nie mają.
 *
 * ⚠️ Dokładając plik wprost do `public/images/`, wygeneruj mu warianty
 * (`node scripts/generate-image-variants.mjs`) – bez nich `srcSet` wskaże pliki,
 * których nie ma, i zdjęcie zniknie ze strony.
 */
const LOCAL_IMAGE_PATTERN = /^\/images\/[^/]+\.webp$/;

/** Czy adres wskazuje na zdjęcie z naszego Storage. */
export function isStorageImage(url: string): boolean {
  return url.includes(PUBLIC_PREFIX) && url.endsWith(".webp");
}

/** Czy zdjęcie ma wygenerowane warianty – ze Storage albo wprost z `public/images/`. */
export function hasVariants(url: string): boolean {
  return isStorageImage(url) || LOCAL_IMAGE_PATTERN.test(url);
}

/**
 * Nazwa wariantu: `abc.webp` → `abc-w400.webp`.
 *
 * Sufiks `-w{n}` celowo nie koliduje z `-ai` z `lib/ai.ts` (`isAiGeneratedImage`
 * rozpoznaje zdjęcia z modelu po końcówce `-ai.webp`). W bazie zapisujemy zawsze
 * **oryginał**, więc rozpoznanie działa jak dotąd, a warianty dokłada loader.
 */
export function variantName(name: string, width: number): string {
  return name.replace(/\.webp$/, `-w${width}.webp`);
}

/** Adres wariantu o danej szerokości dla pliku z naszego Storage. */
export function variantUrl(url: string, width: number): string {
  return variantName(url, width);
}

/**
 * Wariant, który pokryje żądaną szerokość: najmniejszy z listy, który jest od niej
 * nie mniejszy. Powyżej największego wariantu (i dla zdjęć bez wariantów – obcych
 * albo z `public/images/products/`) zwracamy adres oryginału.
 */
export function bestVariantUrl(url: string, width: number): string {
  if (!hasVariants(url)) return url;
  // Zdjęcie, które samo jest wariantem, zostawiamy w spokoju – inaczej loader
  // dokleiłby drugi sufiks (`-w400-w800.webp`) i trafił w nieistniejący plik
  if (isVariantName(url)) return url;
  const match = IMAGE_VARIANT_WIDTHS.find((w) => w >= width);
  return match ? variantUrl(url, match) : url;
}

/** Wszystkie warianty danego pliku – do wygenerowania albo do usunięcia. */
export function variantNames(name: string): string[] {
  return IMAGE_VARIANT_WIDTHS.map((w) => variantName(name, w));
}

/** Czy nazwa (albo adres) wskazuje na gotowy wariant, np. `abc-w400.webp`. */
export function isVariantName(name: string): boolean {
  return /-w\d+\.webp$/.test(name);
}

/**
 * Oryginały, którym brakuje choć jednego wariantu – z płaskiej listy nazw plików
 * w buckecie. Czysta funkcja, żeby migracja dała się przetestować bez Storage.
 */
export function pendingOriginals(files: string[]): string[] {
  const existing = new Set(files);
  return files
    .filter((name) => name.endsWith(".webp") && !isVariantName(name))
    .filter((name) => variantNames(name).some((v) => !existing.has(v)));
}
