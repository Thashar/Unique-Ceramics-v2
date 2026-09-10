/**
 * Skrypt jednorazowy: dogenerowuje **warianty rozmiarowe** dla zdjęć, które są już
 * w Supabase Storage (bucket "products").
 *
 * Po co: sklep nie korzysta z optymalizatora obrazów Vercela (limit 5 000
 * transformacji miesięcznie pękał w kilka dni – powód opisany w `next.config.ts`).
 * Rozmiary generujemy sami przy wgrywaniu zdjęcia, a `next/image` wskazuje je
 * własnym loaderem. Zdjęcia wgrane **przed** tą zmianą wariantów nie mają, więc
 * `srcSet` prowadziłby do nieistniejących plików – ten skrypt je uzupełnia.
 *
 * Uruchomienie:
 *   node scripts/generate-image-variants.mjs
 *
 * Obejmuje zdjęcia w Storage **oraz** pliki wprost w `public/images/` (hero, „O mnie",
 * warsztaty, logo, wordmark) – te ostatnie renderuje ten sam `next/image`, więc też
 * potrzebują wariantów. Powstałe pliki commituje się razem z kodem.
 *
 * Flagi:
 *   --dry-run             Tylko wypisz, co powstałoby – bez zapisu
 *   --local-only          Pomiń Storage, przerób tylko pliki z public/images
 *   --refresh-originals   Wgraj oryginały ponownie z długim `cache-control`
 *                         (Storage domyślnie odpowiada `no-cache`, więc każde
 *                         otwarcie podglądu pobiera pełny plik od nowa).
 *                         Operacja nadpisuje istniejące pliki – uruchamiaj świadomie.
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// Załaduj .env.local jeśli istnieje (dotenv/config ładuje tylko .env)
try {
  const envLocal = readFileSync(".env.local", "utf-8");
  for (const line of envLocal.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // brak .env.local – zmienne mogą pochodzić z .env albo ze środowiska
}

/**
 * Szerokości czytamy **wprost z `lib/image-variants.ts`**, zamiast przepisywać je
 * tutaj. Skrypt jest zwykłym modułem `.mjs` i nie zaimportuje pliku TypeScriptu,
 * a rozjazd obu list byłby cichy: sklep prosiłby o rozmiar, którego skrypt nie
 * wygenerował, i zamiast zdjęcia zostałby pusty kadr.
 */
function readVariantWidths() {
  const src = readFileSync("lib/image-variants.ts", "utf-8");
  const match = src.match(/IMAGE_VARIANT_WIDTHS\s*=\s*\[([^\]]+)\]/);
  if (!match) throw new Error("Nie znaleziono IMAGE_VARIANT_WIDTHS w lib/image-variants.ts");
  const widths = match[1]
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n));
  if (!widths.length) throw new Error("Pusta lista IMAGE_VARIANT_WIDTHS");
  return widths;
}

const WIDTHS = readVariantWidths();
const BUCKET = "products";
const CACHE_CONTROL = "31536000";
const VARIANT_QUALITY = 90;
const ORIGINAL_MAX_WIDTH = 1920;
/** Nazewnictwo musi zgadzać się z `variantName()` w `lib/image-variants.ts`. */
const variantName = (name, width) => name.replace(/\.webp$/, `-w${width}.webp`);
const isVariant = (name) => /-w\d+\.webp$/.test(name);

const dryRun = process.argv.includes("--dry-run");
const refreshOriginals = process.argv.includes("--refresh-originals");

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
// Bez kluczy przerabiamy wyłącznie pliki z repozytorium – dzięki temu warianty
// dla `public/images` da się wygenerować i zacommitować bez dostępu do Storage.
const localOnly = process.argv.includes("--local-only") || !supabaseUrl || !supabaseKey;
if (localOnly && !process.argv.includes("--local-only")) {
  console.warn("Brak SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY – pomijam Storage.\n");
}
const supabase = localOnly ? null : createClient(supabaseUrl, supabaseKey);

/** Cała zawartość bucketa – Storage oddaje ją stronami po 100. */
async function listAll() {
  const files = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: pageSize, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Listowanie bucketa: ${error.message}`);
    if (!data?.length) break;
    files.push(...data.map((f) => f.name));
    if (data.length < pageSize) break;
  }
  return files;
}

/**
 * Wariant o zadanej szerokości – albo kopia oryginału, gdy przekodowanie go nie
 * zmniejszyło. Zdjęcia w `public/` bywają skompresowane mocniej niż nasze q90, więc
 * ponowne kodowanie potrafiło dać plik cięższy od źródła (hero: 221 kB → 266 kB).
 * Wariant musi istnieć, bo loader liczy jego nazwę i nie sprawdza, czy plik jest –
 * ale nigdy nie może kosztować odwiedzającego więcej niż oryginał.
 */
async function smallerOf(source, width) {
  const variant = await sharp(source)
    .resize({ width: Math.min(width, ORIGINAL_MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: VARIANT_QUALITY })
    .toBuffer();
  return variant.byteLength < source.byteLength ? variant : source;
}

async function download(name) {
  const { data, error } = await supabase.storage.from(BUCKET).download(name);
  if (error) throw new Error(`Pobranie ${name}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Blob, nie Buffer – supabase-js potrafi uszkodzić surowe bajty (patrz /api/admin/upload). */
async function put(name, buffer, { upsert = false } = {}) {
  const blob = new Blob([new Uint8Array(buffer)], { type: "image/webp" });
  const { error } = await supabase.storage.from(BUCKET).upload(name, blob, {
    contentType: "image/webp",
    upsert,
    cacheControl: CACHE_CONTROL,
  });
  if (error) throw new Error(`Zapis ${name}: ${error.message}`);

  const { data: info, error: infoError } = await supabase.storage.from(BUCKET).info(name);
  if (infoError) {
    console.warn(`   ! nie udało się sprawdzić rozmiaru ${name}: ${infoError.message}`);
  } else if (info && typeof info.size === "number" && info.size !== buffer.byteLength) {
    throw new Error(`Uszkodzony zapis ${name}: oczekiwano ${buffer.byteLength} B, zapisano ${info.size} B`);
  }
}

async function main() {
  console.log(`Warianty do wygenerowania: ${WIDTHS.join(", ")} px`);
  if (dryRun) console.log("TRYB PRÓBNY – nic nie zostanie zapisane\n");

  const all = supabase ? await listAll() : [];
  const originals = all.filter((n) => n.endsWith(".webp") && !isVariant(n));
  const existing = new Set(all);

  if (supabase) {
    console.log(`Plików w buckecie: ${all.length} (oryginałów: ${originals.length})\n`);
  }

  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  const failed = [];

  for (const name of originals) {
    const missing = WIDTHS.filter((w) => !existing.has(variantName(name, w)));
    const needsOriginal = refreshOriginals;

    if (!missing.length && !needsOriginal) {
      skipped++;
      continue;
    }

    if (dryRun) {
      const parts = [];
      if (missing.length) parts.push(`warianty ${missing.join(", ")}`);
      if (needsOriginal) parts.push("odświeżenie oryginału");
      console.log(`• ${name} → ${parts.join(" + ")}`);
      created += missing.length;
      if (needsOriginal) refreshed++;
      continue;
    }

    try {
      const source = await download(name);

      if (needsOriginal) {
        // Ten sam plik, wgrany ponownie wyłącznie po to, żeby dostał nagłówek
        // `cache-control`. Nie przekodowujemy go – każde kolejne przejście przez
        // kompresję to strata jakości.
        await put(name, source, { upsert: true });
        refreshed++;
      }

      for (const width of missing) {
        // `withoutEnlargement` zostawia mniejsze zdjęcie w jego rozmiarze, ale plik
        // i tak musi powstać: loader liczy nazwy wariantów z nazwy oryginału i nie
        // sprawdza, czy istnieją – brak pliku to zepsute zdjęcie w sklepie.
        const variant = await smallerOf(source, width);
        await put(variantName(name, width), variant);
        created++;
      }

      console.log(`✓ ${name}${missing.length ? ` (+${missing.length})` : ""}`);
    } catch (err) {
      console.error(`✗ ${name}: ${err.message}`);
      failed.push(name);
    }
  }

  // --- zdjęcia z public/images/ ---
  // Hero, „O mnie", warsztaty, logo i wordmark leżą w repozytorium, nie w Storage,
  // a mimo to renderuje je `next/image` – muszą więc mieć te same warianty.
  // Podkatalog `products/` pomijamy: to pliki sprzed przeniesienia katalogu
  // do Storage, których nikt już nie wyświetla (wzorzec w `lib/image-variants.ts`).
  const localDir = join("public", "images");
  let localCreated = 0;
  if (existsSync(localDir)) {
    const localFiles = readdirSync(localDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".webp") && !isVariant(e.name))
      .map((e) => e.name);

    console.log(`\nZdjęcia w public/images: ${localFiles.length}`);

    for (const name of localFiles) {
      const missing = WIDTHS.filter((w) => !existsSync(join(localDir, variantName(name, w))));
      if (!missing.length) {
        skipped++;
        continue;
      }
      if (dryRun) {
        console.log(`• public/images/${name} → warianty ${missing.join(", ")}`);
        localCreated += missing.length;
        continue;
      }
      try {
        const source = readFileSync(join(localDir, name));
        for (const width of missing) {
          const variant = await smallerOf(source, width);
          writeFileSync(join(localDir, variantName(name, width)), variant);
          localCreated++;
        }
        console.log(`✓ public/images/${name} (+${missing.length})`);
      } catch (err) {
        console.error(`✗ public/images/${name}: ${err.message}`);
        failed.push(`public/images/${name}`);
      }
    }
  }

  console.log("\n— Podsumowanie —");
  console.log(`Warianty w Storage:         ${created}`);
  console.log(`Warianty w public/images:   ${localCreated}`);
  if (refreshOriginals) console.log(`Odświeżone oryginały:       ${refreshed}`);
  console.log(`Pominięte (już kompletne):  ${skipped}`);
  console.log(`Błędy:                      ${failed.length}`);
  if (failed.length) {
    console.log("\nPliki z błędem – uruchom skrypt ponownie, przetworzy tylko brakujące:");
    failed.forEach((n) => console.log(`  ${n}`));
    process.exitCode = 1;
  }
  if (supabase && !refreshOriginals && !dryRun) {
    console.log(
      "\nWskazówka: oryginały nadal mają `cache-control: no-cache` z Supabase.\n" +
      "Uruchom `node scripts/generate-image-variants.mjs --refresh-originals`,\n" +
      "żeby wgrać je ponownie z rocznym cache (podgląd zdjęcia przestanie się\n" +
      "wtedy pobierać od nowa przy każdym otwarciu)."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
