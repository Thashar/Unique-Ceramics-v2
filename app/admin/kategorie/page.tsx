export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES, type Category } from "@/lib/categories";
import CategoriesSection from "@/components/admin/CategoriesSection";
import { getSettings } from "@/lib/settings";
import { enCategoryKey } from "@/lib/i18n-content";
import CollectionsManager from "@/components/admin/CollectionsManager";
import CategoryDimensions from "@/components/admin/CategoryDimensions";
import {
  categoryDimensionsKey,
  parseCategoryDimensions,
  type DimensionId,
} from "@/lib/product-dimensions";
import type { Collection } from "@/lib/collection-defaults";

export default async function CategoriesPage() {
  let categories: Category[] = [];
  let migrationNeeded = false;

  try {
    const rows = await db.category.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    categories = rows.length > 0 ? rows : (DEFAULT_CATEGORIES as Category[]);
  } catch {
    // Tabela Category nie istnieje w bazie – migracja nie została uruchomiona
    migrationNeeded = true;
  }

  // Kolekcje (serie produktów) – osobna tabela, migracja ręczna, więc brak
  // tabeli nie może wywrócić strony kategorii
  let collections: Collection[] = [];
  try {
    collections = await db.collection.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  } catch {
    collections = [];
  }

  // Angielskie etykiety kategorii (klucze `en_category_{id}`) – zakładka EN
  // oraz wymiary używane przez kategorię (`category_dims_{id}`)
  const enRows = await getSettings([
    ...categories.map((c) => enCategoryKey(c.id)),
    ...categories.map((c) => categoryDimensionsKey(c.id)),
  ]);
  const english = Object.fromEntries(categories.map((c) => [c.id, enRows[enCategoryKey(c.id)] ?? ""]));
  const dimensions: Record<string, DimensionId[]> = Object.fromEntries(
    categories.map((c) => [c.id, parseCategoryDimensions(enRows[categoryDimensionsKey(c.id)])])
  );

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Kategorie</h1>
      <p className="text-sm text-charcoal/80 mb-8">
        Kategorie wyświetlane jako filtry w sklepie. Slug jest używany w adresie strony kategorii
        (/sklep/kategoria/…) i musi pasować do wartości wpisanej w produktach.
      </p>

      {migrationNeeded ? (
        <div className="max-w-xl p-5 bg-red-50 border border-red-200 text-sm space-y-3">
          <p className="font-medium text-red-700">Brakuje tabeli w bazie danych</p>
          <p className="text-red-700">
            Tabela <code className="font-mono bg-red-100 px-1">Category</code> nie istnieje w Supabase.
            Uruchom poniższe zapytanie w <strong>Supabase → SQL Editor</strong>:
          </p>
          <pre className="bg-white border border-red-200 text-xs font-mono p-4 overflow-x-auto text-charcoal leading-5 whitespace-pre">{`CREATE TABLE "Category" (
    "id"        TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");`}</pre>
          <p className="text-red-700 text-xs">Po wykonaniu odśwież tę stronę.</p>
        </div>
      ) : (
        <>
          <CategoriesSection initialCategories={categories} english={english} />
          <CategoryDimensions categories={categories} initial={dimensions} />
          <CollectionsManager initial={collections} />
        </>
      )}
    </div>
  );
}
