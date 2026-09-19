"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import { SaveButton } from "@/components/admin/settings-fields";
import {
  DIMENSION_FIELDS,
  categoryDimensionsKey,
  serializeCategoryDimensions,
  type DimensionId,
} from "@/lib/product-dimensions";
import type { Category } from "@/lib/category-defaults";

/**
 * **Wymiary używane przez kategorię** (`/admin/kategorie`, pod listą kategorii).
 *
 * Zaznaczone pola pojawiają się potem w formularzu produktu i to o nie pyta
 * agent dodawania produktów – zamiast zgadywać etykiety z losowych produktów
 * wzorcowych. Kategoria bez zaznaczeń (np. obrazy) po prostu nie ma wymiarów.
 *
 * Zapis idzie do `Setting` pod `category_dims_{id}` (kluczem jest **id, nie
 * slug** – zmiana sluga nie gubi ustawienia), więc **nie wymaga migracji bazy**.
 */
export default function CategoryDimensions({
  categories,
  initial,
}: {
  categories: Category[];
  initial: Record<string, DimensionId[]>;
}) {
  const [picked, setPicked] = useState<Record<string, DimensionId[]>>(initial);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  function toggle(categoryId: string, dim: DimensionId) {
    setPicked((prev) => {
      const current = prev[categoryId] ?? [];
      const next = current.includes(dim) ? current.filter((d) => d !== dim) : [...current, dim];
      return { ...prev, [categoryId]: next };
    });
  }

  async function save() {
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          categories.map((c) => ({
            key: categoryDimensionsKey(c.id),
            value: serializeCategoryDimensions(picked[c.id] ?? []),
          }))
        ),
      });
      if (!res.ok) throw new Error();
      setToast("Zapisano wymiary kategorii.");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setError("Nie udało się zapisać wymiarów kategorii.");
    }
  }

  return (
    <section className="mt-12 max-w-3xl">
      <h2 className="font-serif text-2xl text-espresso mb-2 flex items-center gap-2">
        <Ruler size={20} strokeWidth={1.5} className="text-clay" />
        Wymiary kategorii
      </h2>
      <p className="text-sm text-charcoal/80 mb-6">
        Zaznacz, które wymiary opisują produkty z danej kategorii. Te pola pojawią się w formularzu
        produktu i o nie zapyta agent dodawania produktów – razem z wartościami podobnych produktów
        z tej kategorii. Kategoria bez zaznaczeń nie ma wymiarów.
      </p>

      {categories.length === 0 ? (
        <p className="text-sm text-charcoal/80">Najpierw dodaj kategorie.</p>
      ) : (
        <div className="space-y-4">
          {categories.map((c) => (
            <div key={c.id} className="border border-sand bg-warm-white p-4">
              <div className="text-sm text-espresso mb-3">
                {c.label}
                <span className="ml-2 text-[11px] font-mono text-charcoal/80">{c.slug}</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {DIMENSION_FIELDS.map((field) => (
                  <label key={field.id} className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(picked[c.id] ?? []).includes(field.id)}
                      onChange={() => toggle(c.id, field.id)}
                      className="accent-clay"
                    />
                    {field.label}
                    <span className="text-[11px] text-charcoal/80">({field.unit})</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-700 mt-4">{error}</p>}
      {toast && <p className="text-sm text-green-700 mt-4">{toast}</p>}
      <div className="mt-6">
        <SaveButton onClick={save} label="Zapisz wymiary kategorii" />
      </div>
    </section>
  );
}
