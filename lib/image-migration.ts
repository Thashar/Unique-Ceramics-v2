import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IMAGE_VARIANT_WIDTHS,
  STORAGE_BUCKET,
  isVariantName,
  pendingOriginals,
  variantName,
} from "@/lib/image-variants";
import { writeMissingVariants } from "@/lib/storage-variants";

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

/** Cała zawartość bucketa – Storage oddaje ją stronami po 100. */
export async function listStorageImages(supabase: SupabaseClient): Promise<string[]> {
  const files: string[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list("", { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    files.push(...data.map((f) => f.name));
    if (data.length < pageSize) break;
  }
  return files;
}

export type MigrationStatus = { total: number; pending: number };

/** Ile zdjęć w ogóle i ile czeka na warianty – do opisu stanu w panelu. */
export async function migrationStatus(supabase: SupabaseClient): Promise<MigrationStatus> {
  const files = await listStorageImages(supabase);
  const originals = files.filter((n) => n.endsWith(".webp") && !isVariantName(n));
  return { total: originals.length, pending: pendingOriginals(files).length };
}

export type BatchResult = {
  processed: number;
  remaining: number;
  failed: string[];
};

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
  limit: number
): Promise<BatchResult> {
  const files = await listStorageImages(supabase);
  const existing = new Set(files);
  const pending = pendingOriginals(files);
  const batch = pending.slice(0, limit);
  const failed: string[] = [];
  let processed = 0;

  for (const name of batch) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(name);
      if (error || !data) throw new Error(error?.message ?? "brak pliku");
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
      failed.push(name);
    }
  }

  return { processed, remaining: Math.max(0, pending.length - processed), failed };
}
