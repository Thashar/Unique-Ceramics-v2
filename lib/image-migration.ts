import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IMAGE_VARIANT_WIDTHS,
  STORAGE_BUCKET,
  isVariantName,
  pendingOriginals,
  variantName,
} from "@/lib/image-variants";
import { message, writeMissingVariants } from "@/lib/storage-variants";

/**
 * Dogenerowanie **wariantów rozmiarowych** dla zdjęć wgranych do Storage, zanim
 * warianty w ogóle istniały (patrz „Rozmiary zdjęć” w CLAUDE.md). Bez nich `srcSet`
 * wskazuje pliki, których nie ma, i zdjęcie znika ze sklepu.
 *
 * Używa tego przycisk w panelu (`/admin/ustawienia?s=zdjecia` →
 * `/api/admin/image-variants`). To samo robi `scripts/generate-image-variants.mjs`,
 * który dodatkowo obsługuje pliki w `public/images` – tych z panelu ruszyć nie można,
 * bo na produkcji system plików jest tylko do odczytu. Skrypt zostaje narzędziem
 * **przed wdrożeniem**, panel – po nim.
 *
 * Migracja idzie **partiami**: jedno wywołanie trasy przetwarza kilka zdjęć i zwraca,
 * ile zostało. Funkcja serverless ma limit czasu, a 40 zdjęć × 3 rozmiary to zbyt
 * długa robota na jedno żądanie.
 */


/** Rozmiary, które generuje migracja – panel pokazuje je w opisie. */
export const MIGRATION_WIDTHS = IMAGE_VARIANT_WIDTHS;

/** Jeden obiekt z magazynu – nazwa plus metadane potrzebne przy sprzątaniu. */
export type StorageObject = { name: string; size: number; createdAt: string | null };

/**
 * Cała zawartość bucketa – Storage oddaje ją stronami po 100.
 *
 * Zwracamy rozmiar i datę utworzenia, bo korzysta z tego wyszukiwanie nieużywanych
 * plików (`lib/storage-usage.ts`): rozmiar mówi, ile miejsca zwolni sprzątanie,
 * a data chroni świeże uploady przed skasowaniem.
 */
export async function listStorageObjects(supabase: SupabaseClient): Promise<StorageObject[]> {
  const files: StorageObject[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list("", { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const f of data) {
      files.push({
        name: f.name,
        size: typeof f.metadata?.size === "number" ? f.metadata.size : 0,
        createdAt: f.created_at ?? null,
      });
    }
    if (data.length < pageSize) break;
  }
  return files;
}

/** Same nazwy – tyle wystarczy migracji wariantów. */
export async function listStorageImages(supabase: SupabaseClient): Promise<string[]> {
  return (await listStorageObjects(supabase)).map((f) => f.name);
}

export type MigrationStatus = { total: number; pending: number };

/** Ile zdjęć w ogóle i ile czeka na warianty – do opisu stanu w panelu. */
export async function migrationStatus(supabase: SupabaseClient): Promise<MigrationStatus> {
  const files = await listStorageImages(supabase);
  const originals = files.filter((n) => n.endsWith(".webp") && !isVariantName(n));
  return { total: originals.length, pending: pendingOriginals(files).length };
}

/**
 * Zdjęcie, którego nie udało się przetworzyć – **razem z powodem**. Sama nazwa pliku
 * nie mówiła nic: właściciel widział w panelu listę nazw i nie miał jak zgadnąć, czy
 * zawiódł `sharp`, magazyn, czy pobranie pliku (09.09.2026). Powód idzie do panelu
 * i to on decyduje, co robić dalej.
 */
export type FailedImage = { name: string; reason: string };

export type BatchResult = {
  processed: number;
  remaining: number;
  failed: FailedImage[];
};

/**
 * Plik w Storage, którego `sharp` nie umie odczytać. W praktyce oznacza to zdjęcie
 * wgrane **starym uploadem**, zanim trasa zaczęła wysyłać `Blob` zamiast `Buffer`a:
 * supabase-js przepuszczał wtedy bajty przez konwersję na tekst i każdy bajt spoza
 * ASCII stawał się `EF BF BD` (U+FFFD). Nagłówek RIFF takiego pliku wygląda tak:
 * `52 49 46 46 | 12 EF BF BD …`. Danych nie da się odzyskać – zamiana jest
 * nieodwracalna – więc migracja takie zdjęcie **pomija i idzie dalej**, zamiast
 * zatrzymywać się na nim w kółko. Zwykle są to stare, nieużywane już pliki.
 */
const UNREADABLE_MARKERS = [
  "unsupported image format",
  "Input buffer contains",
  "Input file contains",
];

export function isUnreadableImage(reason: string): boolean {
  return UNREADABLE_MARKERS.some((m) => reason.includes(m));
}

/** Komunikat dla panelu – po polsku i z podpowiedzią, co z tym zrobić. */
export function describeFailure(reason: string): string {
  return isUnreadableImage(reason)
    ? "plik w magazynie jest uszkodzony i nie da się go odczytać – wgraj to zdjęcie ponownie (stare pliki, których sklep już nie używa, można zignorować)"
    : reason;
}

/**
 * Przetwarza kolejną partię zdjęć bez kompletu wariantów.
 *
 * Warianty składa `uploadImageWithVariants` – ta sama funkcja, której używa upload,
 * więc migracja i nowe zdjęcia dają identyczny wynik. Oryginał jest przy okazji
 * **zapisywany ponownie**, bo tylko tak dostanie nagłówek `cache-control` (Storage
 * odpowiada domyślnie `no-cache`); dlatego kasujemy go dopiero po pobraniu bufora
 * i tuż przed zapisem, a nie z góry.
 *
 * Zdjęcie, które się nie uda, trafia do `failed` i **nie blokuje pozostałych** –
 * kolejne wywołanie spróbuje je ponownie, bo wariantów nadal mu brakuje.
 */
export async function processBatch(
  supabase: SupabaseClient,
  limit: number,
  skip: readonly string[] = []
): Promise<BatchResult> {
  const files = await listStorageImages(supabase);
  const existing = new Set(files);
  // Zdjęcia, które padły we wcześniejszych partiach, pomijamy. Bez tego migracja
  // stoi w miejscu: nieudane zdjęcie nadal nie ma wariantów, więc wraca na początek
  // listy (sortowanej po nazwie) i każda kolejna partia próbuje tego samego
  const skipped = new Set(skip);
  const pending = pendingOriginals(files).filter((name) => !skipped.has(name));
  const batch = pending.slice(0, limit);
  const failed: FailedImage[] = [];
  let processed = 0;

  for (const name of batch) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(name);
      if (error || !data) {
        throw new Error(`nie udało się pobrać zdjęcia z magazynu: ${error?.message ?? "brak pliku"}`);
      }
      const source = Buffer.from(await data.arrayBuffer());

      // Dopisujemy wyłącznie brakujące rozmiary. Oryginału **nie ruszamy** – to jedyna
      // pełna kopia zdjęcia, a kasowanie go przed ponownym zapisem znaczyłoby, że błąd
      // w połowie operacji kasuje zdjęcie ze sklepu na dobre. Ceną jest to, że oryginał
      // zostaje z nagłówkiem `no-cache` od Supabase; odświeża go dopiero
      // `scripts/generate-image-variants.mjs --refresh-originals`, uruchamiany świadomie
      const missing = MIGRATION_WIDTHS.filter((w) => !existing.has(variantName(name, w)));
      await writeMissingVariants(supabase, name, source, missing);
      processed++;
    } catch (err) {
      console.error(`[image-migration] ${name}:`, err);
      failed.push({ name, reason: describeFailure(message(err)) });
    }
  }

  return {
    processed,
    // To, co zostaje po tej partii – bez zdjęć pominiętych i bez tych, które
    // właśnie padły (klient dopisze je do `skip` przy następnym żądaniu)
    remaining: Math.max(0, pending.length - processed - failed.length),
    failed,
  };
}
