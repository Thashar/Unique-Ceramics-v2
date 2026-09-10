import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IMAGE_VARIANT_WIDTHS,
  ORIGINAL_MAX_WIDTH,
  STORAGE_BUCKET,
  variantName,
  variantNames,
} from "@/lib/image-variants";

/**
 * Zapis zdjęcia do Storage razem z wariantami rozmiarowymi.
 * Serwerowy odpowiednik `lib/image-variants.ts` – tam neutralne nazewnictwo,
 * tu `sharp` i Storage. Używają go wszystkie trasy zapisujące zdjęcia
 * (`/api/admin/upload`, `/api/admin/rotate`, `/api/admin/ai-image`).
 *
 * Warianty zastępują optymalizator Vercela: praca dzieje się **raz**, przy
 * wgrywaniu, zamiast przy każdym wyświetleniu (powód w `next.config.ts`).
 * Dokładając nową trasę zapisującą zdjęcia, wołaj `uploadImageWithVariants` –
 * plik bez wariantów da w sklepie 404 na `srcSet`, bo loader liczy ich nazwy
 * z nazwy oryginału, nie sprawdzając, czy istnieją.
 */

/**
 * Nazwy plików są unikatowe (znacznik czasu + losowy sufiks) i nigdy nie są
 * nadpisywane (`upsert: false`; obrót i AI zapisują pod nową nazwą), więc plik
 * pod danym adresem nigdy się nie zmienia – rok cache jest bezpieczny.
 * Bez tego Storage odpowiada `cache-control: no-cache` i każdy odwiedzający
 * pobiera zdjęcie od nowa.
 */
export const STORAGE_CACHE_CONTROL = "31536000";

/** Jakość wariantów. Oryginał zostaje w q100 – to on jest kopią wzorcową. */
const VARIANT_QUALITY = 90;

type UploadResult = { url: string } | { error: string };

/**
 * Jeden plik do Storage.
 *
 * WAŻNE: nie przekazuj `Buffer`a bezpośrednio do `upload()` – supabase-js wysyła go
 * wtedy jako surowe ciało żądania i w środowisku serverless bajty potrafią przejść
 * przez konwersję na tekst UTF-8 (każdy bajt spoza ASCII → U+FFFD), przez co plik
 * w Storage jest uszkodzony. `Blob` wymusza multipart/form-data – binarnie bezpieczny.
 *
 * Po zapisie porównujemy rozmiar zapisanego obiektu z wysłanym: gdyby transport znów
 * uszkodził bajty, rozmiar się nie zgodzi. Sam odczyt metadanych jest tylko kontrolą –
 * gdy `info()` zawiedzie, plik jest już poprawnie zapisany, więc logujemy ostrzeżenie
 * zamiast wywracać udany zapis.
 */
async function putObject(
  supabase: SupabaseClient,
  name: string,
  buffer: Buffer,
  { verify = true }: { verify?: boolean } = {}
): Promise<string | null> {
  const blob = new Blob([new Uint8Array(buffer)], { type: "image/webp" });
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(name, blob, {
    contentType: "image/webp",
    upsert: false,
    cacheControl: STORAGE_CACHE_CONTROL,
  });
  if (error) return error.message;
  // Wariant sprawdzamy tylko przy pierwszym zapisie zdjęcia. Przy migracji byłby to
  // trzeci dodatkowy round-trip na zdjęcie, a wariant zawsze da się wygenerować
  // ponownie z oryginału – w odróżnieniu od samego oryginału
  if (!verify) return null;

  try {
    const { data: info, error: infoError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .info(name);
    if (infoError) {
      console.warn("[storage-variants] nie udało się odczytać metadanych pliku:", infoError);
    } else if (info && typeof info.size === "number" && info.size !== buffer.byteLength) {
      return `uszkodzony zapis: oczekiwano ${buffer.byteLength} B, zapisano ${info.size} B`;
    }
  } catch (err) {
    console.warn("[storage-variants] wyjątek przy odczycie metadanych pliku:", err);
  }
  return null;
}

/** Czytelny powód błędu – `Error`, string albo cokolwiek, co przyszło z biblioteki. */
export function message(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "nieznany błąd";
}

/**
 * Wariant o zadanej szerokości.
 *
 * Przekodowanie nie zawsze zmniejsza plik: zdjęcie węższe niż wariant przechodzi przez
 * kompresję bez zmiany wymiarów i potrafi urosnąć (`hero.webp` 221 kB → 266 kB). Wtedy
 * zwracamy kopię źródła – wariant musi istnieć, bo loader liczy jego nazwę i nie sprawdza,
 * czy plik jest, ale nigdy nie może kosztować odwiedzającego więcej niż oryginał.
 */
export async function buildVariant(source: Buffer, width: number): Promise<Buffer> {
  const variant = await sharp(source)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: VARIANT_QUALITY })
    .toBuffer();
  return variant.byteLength < source.byteLength ? variant : source;
}

/**
 * Dopisuje brakujące warianty do zdjęcia, które **już leży** w Storage.
 *
 * W odróżnieniu od `uploadImageWithVariants` nie rusza oryginału – używa tego migracja
 * zdjęć wgranych, zanim warianty istniały. Kasowanie i ponowny zapis oryginału byłoby
 * tam ryzykiem utraty jedynej kopii zdjęcia, gdyby zapis zawiódł w połowie.
 *
 * Zwraca nazwy wariantów, które powstały; pierwszy błąd przerywa i leci wyżej –
 * wywołujący ponowi zdjęcie, bo wariantów nadal mu brakuje.
 */
export async function writeMissingVariants(
  supabase: SupabaseClient,
  filename: string,
  source: Buffer,
  widths: readonly number[]
): Promise<string[]> {
  const written: string[] = [];
  for (const width of widths) {
    let payload: Buffer;
    try {
      payload = await buildVariant(source, width);
    } catch (err) {
      // Komunikat leci do panelu, więc musi mówić, na czym stanęło – sama nazwa
      // pliku nie pozwala odróżnić błędu `sharp` od odmowy Storage
      throw new Error(`nie udało się przygotować rozmiaru ${width} px: ${message(err)}`);
    }
    const name = variantName(filename, width);
    const error = await putObject(supabase, name, payload, { verify: false });
    if (error) throw new Error(`nie udało się zapisać rozmiaru ${width} px: ${error}`);
    written.push(name);
  }
  return written;
}

/**
 * Przycina zdjęcie do `ORIGINAL_MAX_WIDTH`, zapisuje jako oryginał, a obok
 * komplet wariantów z `IMAGE_VARIANT_WIDTHS`.
 *
 * Wariant powstaje **zawsze**, także gdy zdjęcie jest węższe niż jego szerokość
 * (`withoutEnlargement` zostawia wtedy oryginalny rozmiar). Loader liczy nazwy
 * wariantów z nazwy pliku i nie ma jak sprawdzić, czy plik istnieje – brakujący
 * wariant byłby po prostu zepsutym zdjęciem w sklepie.
 *
 * Nieudany zapis któregokolwiek pliku sprząta po sobie i zwraca błąd – lepiej
 * odrzucić wgranie niż zapisać w bazie adres zdjęcia z niekompletnym `srcSet`.
 */
export async function uploadImageWithVariants(
  supabase: SupabaseClient,
  filename: string,
  source: Buffer,
  { quality = 100 }: { quality?: number } = {}
): Promise<UploadResult> {
  let original: Buffer;
  try {
    original = await sharp(source)
      .resize({ width: ORIGINAL_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
  } catch (err) {
    console.error("[storage-variants] sharp (oryginał):", err);
    return { error: "Nie udało się przetworzyć obrazu." };
  }

  const written: string[] = [];
  const cleanup = async () => {
    if (written.length) {
      await supabase.storage.from(STORAGE_BUCKET).remove(written).catch(() => {});
    }
  };

  const originalError = await putObject(supabase, filename, original);
  if (originalError) {
    console.error("[storage-variants] zapis oryginału:", originalError);
    // Plik mógł powstać i dopiero kontrola rozmiaru go odrzuciła – sprzątamy,
    // żeby w Storage nie zostawał uszkodzony obiekt pod zajętą już nazwą
    await supabase.storage.from(STORAGE_BUCKET).remove([filename]).catch(() => {});
    return { error: "Nie udało się zapisać pliku w magazynie zdjęć." };
  }
  written.push(filename);

  for (const width of IMAGE_VARIANT_WIDTHS) {
    let payload: Buffer;
    try {
      payload = await buildVariant(original, width);
    } catch (err) {
      console.error(`[storage-variants] sharp (wariant ${width}):`, err);
      await cleanup();
      return { error: "Nie udało się przygotować rozmiarów zdjęcia." };
    }

    const name = variantName(filename, width);
    const error = await putObject(supabase, name, payload);
    if (error) {
      console.error(`[storage-variants] zapis wariantu ${width}:`, error);
      written.push(name);
      await cleanup();
      return { error: "Nie udało się zapisać rozmiarów zdjęcia w magazynie." };
    }
    written.push(name);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
  return { url: data.publicUrl };
}

/** Usuwa zdjęcie razem z wariantami – do sprzątania po nieudanym zapisie. */
export async function removeImageWithVariants(supabase: SupabaseClient, filename: string) {
  await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filename, ...variantNames(filename)])
    .catch(() => {});
}
