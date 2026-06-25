/**
 * Skrypt jednorazowy: konwertuje wszystkie obrazy w Supabase Storage (bucket "products")
 * z JPG/PNG na WebP i aktualizuje URLe w tabeli Product w bazie danych.
 *
 * Uruchomienie:
 *   node scripts/convert-images-to-webp.mjs
 *
 * Flags:
 *   --dry-run   Tylko wyświetl co zostałoby zmienione, bez żadnych operacji
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

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
  // brak .env.local — OK, może być .env
}

const DRY_RUN = process.argv.includes("--dry-run");
const BUCKET = "products";
const QUALITY = 82;
const MAX_WIDTH = 1920;

// ─── Walidacja env ────────────────────────────────────────────────────────────

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIRECT_URL, DATABASE_URL } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local");
  process.exit(1);
}
if (!DIRECT_URL && !DATABASE_URL) {
  console.error("❌  Brak DIRECT_URL lub DATABASE_URL w .env.local");
  process.exit(1);
}

// ─── Klienty ─────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const prisma = new PrismaClient({
  datasources: { db: { url: DIRECT_URL || DATABASE_URL } },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNonWebp(name) {
  return /\.(jpe?g|png)$/i.test(name);
}

function toWebpName(name) {
  return name.replace(/\.(jpe?g|png)$/i, ".webp");
}

async function listAllFiles() {
  const files = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Błąd listowania: ${error.message}`);
    if (!data || data.length === 0) break;
    files.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

async function downloadFile(name) {
  const { data, error } = await supabase.storage.from(BUCKET).download(name);
  if (error) throw new Error(`Błąd pobierania ${name}: ${error.message}`);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadWebp(name, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(name, buffer, { contentType: "image/webp", upsert: false });
  if (error) throw new Error(`Błąd uploadu ${name}: ${error.message}`);
}

async function deleteFile(name) {
  const { error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) throw new Error(`Błąd usuwania ${name}: ${error.message}`);
}

function getPublicUrl(name) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

// ─── Główna logika ────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍  TRYB DRY-RUN — brak zmian\n" : "🚀  Start konwersji\n");

  // 1. Lista plików w Storage
  console.log("📂  Pobieram listę plików z Supabase Storage...");
  const allFiles = await listAllFiles();
  const toConvert = allFiles.filter((f) => isNonWebp(f.name));

  console.log(`   Wszystkich plików: ${allFiles.length}`);
  console.log(`   Do konwersji (JPG/PNG): ${toConvert.length}\n`);

  if (toConvert.length === 0) {
    console.log("✅  Wszystkie pliki są już w formacie WebP.");
    return;
  }

  // 2. Przetwarzaj po kolei
  const urlMap = new Map(); // oldUrl → newUrl

  for (let i = 0; i < toConvert.length; i++) {
    const file = toConvert[i];
    const oldName = file.name;
    const newName = toWebpName(oldName);
    const oldUrl = getPublicUrl(oldName);
    const newUrl = getPublicUrl(newName);

    const prefix = `[${i + 1}/${toConvert.length}]`;
    console.log(`${prefix} ${oldName} → ${newName}`);

    urlMap.set(oldUrl, newUrl);

    if (DRY_RUN) continue;

    try {
      // Pobierz
      const original = await downloadFile(oldName);
      const originalKB = Math.round(original.length / 1024);

      // Konwertuj
      const webp = await sharp(original)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      const webpKB = Math.round(webp.length / 1024);
      const saved = Math.round((1 - webp.length / original.length) * 100);

      // Wgraj WebP
      await uploadWebp(newName, webp);

      // Usuń stary plik
      await deleteFile(oldName);

      console.log(`   ✓  ${originalKB} KB → ${webpKB} KB (−${saved}%)`);
    } catch (err) {
      console.error(`   ✗  BŁĄD: ${err.message}`);
      urlMap.delete(oldUrl); // nie aktualizuj URL jeśli coś poszło nie tak
    }
  }

  if (DRY_RUN) {
    console.log("\n🔍  Dry-run — żadnych zmian nie wprowadzono.");
    return;
  }

  // 3. Aktualizuj URLe w bazie danych
  if (urlMap.size === 0) {
    console.log("\n⚠️  Brak udanych konwersji — baza danych bez zmian.");
    return;
  }

  console.log("\n🗄️  Aktualizuję URLe w bazie danych...");
  const products = await prisma.product.findMany({ select: { id: true, images: true } });
  let updatedCount = 0;

  for (const product of products) {
    const newImages = product.images.map((url) => urlMap.get(url) ?? url);
    const changed = newImages.some((url, i) => url !== product.images[i]);
    if (!changed) continue;

    await prisma.product.update({
      where: { id: product.id },
      data: { images: newImages },
    });
    updatedCount++;
    console.log(`   ✓  Produkt ${product.id}: zaktualizowano ${newImages.filter((u, i) => u !== product.images[i]).length} zdjęć`);
  }

  console.log(`\n✅  Gotowe!`);
  console.log(`   Skonwertowano plików:    ${urlMap.size}`);
  console.log(`   Zaktualizowano produktów: ${updatedCount}`);
}

main()
  .catch((err) => {
    console.error("\n❌  Nieoczekiwany błąd:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
