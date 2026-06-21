export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import CategoriesManager from "@/components/admin/CategoriesManager";

export default async function CategoriesPage() {
  let categories = await db.category.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  // Jeśli baza jest pusta — pokaż fallback (odróżnialny po prefiksie "_" id)
  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES as typeof categories;
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-2">Kategorie</h1>
      <p className="text-sm text-charcoal/50 mb-8">
        Kategorie wyświetlane jako filtry w sklepie. Slug jest używany w URL (?kategoria=…) i musi pasować do wartości wpisanej w produktach.
      </p>
      <CategoriesManager initialCategories={categories} />
    </div>
  );
}
