import type { SupabaseClient } from "@supabase/supabase-js";
import { db, withDbRetry } from "@/lib/db";
import { STORAGE_BUCKET } from "@/lib/image-variants";
import { listStorageObjects } from "@/lib/image-migration";
import {
  CLEANUP_MIN_AGE_MS,
  collectUsedNames,
  findUnused,
  totalSize,
  type UnusedFile,
} from "@/lib/storage-cleanup";

/**
 * Odczyt bazy dla sprzątania magazynu (serwer). Czystą logikę – co jest używane,
 * a co nie – trzyma `lib/storage-cleanup.ts`; tutaj zbieramy **surowe teksty**,
 * w których może siedzieć adres zdjęcia.
 *
 * ⚠️ To jest miejsce, w którym pomyłka kasuje zdjęcie ze sklepu. Zbieramy dlatego
 * **całą treść**, nie wybrane pola: `Product.images` i opis, `Project.images` i opis
 * (HTML z edytora – można w niego wstawić obrazek), oraz **wszystkie** wartości
 * z tabeli `Setting` bez wyliczania kluczy. Dokładając miejsce, w którym zapisujesz
 * adres zdjęcia, **dopisz je tutaj** – inaczej sprzątanie uzna plik za nieużywany.
 */

/** Nieużywany plik razem z adresem podglądu dla panelu. */
export type UnusedWithUrl = UnusedFile & { url: string };

export type CleanupScan = {
  /** Wszystkie pliki w magazynie. */
  total: number;
  /** Pliki wskazywane przez bazę (razem z wariantami). */
  used: number;
  /** Kandydaci do usunięcia – nieużywane i starsze niż karencja. */
  unused: UnusedWithUrl[];
  /** Ile pominięto wyłącznie ze względu na wiek. */
  tooFresh: number;
  /** Ile bajtów zwolniłoby usunięcie wszystkich kandydatów. */
  freeableBytes: number;
  /** Karencja w dniach – panel pokazuje ją w opisie. */
  minAgeDays: number;
};

/**
 * Wszystkie teksty z bazy, w których może być adres zdjęcia.
 *
 * Zapytania idą **sekwencyjnie** (pula Supabase jest wąska – patrz `lib/db.ts`),
 * a każde przez `withDbRetry`. Błąd leci wyżej: sprzątanie na niepełnej liście
 * użyć skasowałoby żywe zdjęcia, więc lepiej przerwać skan niż zgadywać.
 */
export async function collectSources(): Promise<string[]> {
  const sources: string[] = [];

  const products = await withDbRetry(() =>
    db.product.findMany({ select: { images: true, description: true } })
  );
  for (const p of products) {
    sources.push(...p.images);
    if (p.description) sources.push(p.description);
  }

  const projects = await withDbRetry(() =>
    db.project.findMany({ select: { images: true, description: true } })
  );
  for (const p of projects) {
    sources.push(...p.images);
    if (p.description) sources.push(p.description);
  }

  // Wszystkie ustawienia, bez wyliczania kluczy: adresy zdjęć siedzą i w prostych
  // kluczach (`home_hero_image`), i w JSON-ie galerii, i w treściach HTML
  const settings = await withDbRetry(() => db.setting.findMany({ select: { value: true } }));
  for (const s of settings) if (s.value) sources.push(s.value);

  return sources;
}

/** Skan magazynu: co jest używane, co można usunąć. */
export async function scanStorage(supabase: SupabaseClient): Promise<CleanupScan> {
  const [files, sources] = [await listStorageObjects(supabase), await collectSources()];
  const used = collectUsedNames(sources);
  const { unused, tooFresh } = findUnused(files, used);

  // Publiczny adres każdego kandydata – panel pokazuje miniaturę, żeby właściciel
  // zobaczył, co kasuje. Sama nazwa pliku nikomu nic nie mówi
  const withUrls = unused.map((f) => ({
    ...f,
    url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(f.name).data.publicUrl,
  }));

  return {
    total: files.length,
    used: files.filter((f) => used.has(f.name)).length,
    unused: withUrls,
    tooFresh,
    freeableBytes: totalSize(withUrls),
    minAgeDays: Math.round(CLEANUP_MIN_AGE_MS / 86_400_000),
  };
}

/**
 * Usuwa wskazane pliki – ale **tylko te, które sam skan uznał za nieużywane**.
 *
 * Nazwy przychodzą od klienta, więc listę weryfikujemy jeszcze raz na serwerze:
 * bez tego wystarczyłoby podmienić żądanie, żeby skasować dowolne zdjęcie ze sklepu.
 * Zwraca liczbę usuniętych i nazwy odrzucone (np. gdy zdjęcie w międzyczasie zostało
 * gdzieś użyte albo skan jest nieaktualny).
 */
export async function removeUnused(
  supabase: SupabaseClient,
  names: readonly string[]
): Promise<{ removed: number; rejected: string[]; freedBytes: number }> {
  const scan = await scanStorage(supabase);
  const allowed = new Map(scan.unused.map((f) => [f.name, f]));

  const toRemove: string[] = [];
  const rejected: string[] = [];
  for (const name of names) {
    if (allowed.has(name)) toRemove.push(name);
    else rejected.push(name);
  }

  if (!toRemove.length) return { removed: 0, rejected, freedBytes: 0 };

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(toRemove);
  if (error) throw new Error(error.message);

  return {
    removed: toRemove.length,
    rejected,
    freedBytes: totalSize(toRemove.map((n) => allowed.get(n)!)),
  };
}
