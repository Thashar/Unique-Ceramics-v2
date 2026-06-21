export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES, type Category } from "@/lib/categories";
import CategoriesManager from "@/components/admin/CategoriesManager";

export default async function CategoriesPage() {
  let categories: Category[] = [];
  let migrationNeeded = false;

  try {
    const rows = await db.category.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    categories = rows.length > 0 ? rows : (DEFAULT_CATEGORIES as Category[]);
  } catch {
    // Tabela Category nie istnieje w bazie — migracja nie została uruchomiona
    migrationNeeded = true;
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Kategorie</h1>
      <p className="text-sm text-charcoal/50 mb-8">
        Kategorie wyświetlane jako filtry w sklepie. Slug jest używany w URL (?kategoria=…) i musi pasować do wartości wpisanej w produktach.
      </p>

      {migrationNeeded ? (
        <div className="max-w-xl p-5 bg-red-50 border border-red-200 text-sm space-y-3">
          <p className="font-medium text-red-700">Brakuje tabeli w bazie danych</p>
          <p className="text-red-600">
            Tabela <code className="font-mono bg-red-100 px-1">Category</code> nie istnieje w Supabase.
            Uruchom poniższe zapytanie w <strong>Supabase → SQL Editor</strong>:
          </p>
          <pre className="bg-white border border-red-200 text-xs font-mono p-4 overflow-x-auto text-gray-800 leading-5 whitespace-pre">{`CREATE TABLE "Category" (
    "id"        TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "order"     INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");`}</pre>
          <p className="text-red-600 text-xs">Po wykonaniu odśwież tę stronę.</p>
        </div>
      ) : (
        <CategoriesManager initialCategories={categories} />
      )}
    </div>
  );
}
