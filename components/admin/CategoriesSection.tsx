"use client";

import { useState } from "react";
import CategoriesManager from "@/components/admin/CategoriesManager";
import LangSwitch from "@/components/admin/LangSwitch";
import TranslateButton from "@/components/admin/TranslateButton";
import { SaveButton } from "@/components/admin/settings-fields";
import { translateTexts } from "@/lib/admin-translate";
import { enCategoryKey } from "@/lib/i18n-content";
import type { Category } from "@/lib/category-defaults";
import type { Locale } from "@/lib/i18n";

/**
 * Sekcja kategorii w panelu z przełącznikiem PL / EN u góry po prawej.
 * PL to dotychczasowy `CategoriesManager` (CRUD, kolejność); EN – lista tych
 * samych kategorii z angielską etykietą przy każdej, zapisywaną do `Setting`
 * pod `en_category_{id}` (kluczem jest id, nie slug – zmiana sluga w PL nie
 * gubi tłumaczenia). Pusta etykieta = strona `/en` pokazuje polską.
 */
export default function CategoriesSection({
  initialCategories,
  english,
}: {
  initialCategories: Category[];
  english: Record<string, string>;
}) {
  const [lang, setLang] = useState<Locale>("pl");
  const [labels, setLabels] = useState<Record<string, string>>(english);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  async function translateAll() {
    const translated = await translateTexts(initialCategories.map((c) => c.label));
    setLabels(Object.fromEntries(initialCategories.map((c, i) => [c.id, translated[i]])));
  }

  async function save() {
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          initialCategories.map((c) => ({ key: enCategoryKey(c.id), value: (labels[c.id] ?? "").trim() }))
        ),
      });
      if (!res.ok) throw new Error();
      setToast("Zapisano wersję angielską kategorii.");
      setTimeout(() => setToast(""), 3000);
    } catch {
      setError("Nie udało się zapisać angielskich etykiet.");
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <LangSwitch value={lang} onChange={setLang} />
      </div>

      {lang === "pl" ? (
        <CategoriesManager initialCategories={initialCategories} />
      ) : (
        <div className="max-w-xl space-y-6">
          <div className="bg-mist border border-sand p-4 text-xs text-charcoal/80 leading-relaxed space-y-3">
            <p>
              Nazwy kategorii na wersji angielskiej (<code className="font-mono">/en</code>) – pasek
              kategorii, karty produktów, okruszki. Puste pole = strona pokaże polską nazwę.
              Dodawanie i kolejność kategorii zmienia się w zakładce PL.
            </p>
            <TranslateButton
              onTranslate={translateAll}
              hasContent={initialCategories.some((c) => labels[c.id]?.trim())}
              label="Przetłumacz wszystkie przez AI"
            />
          </div>

          {initialCategories.length === 0 ? (
            <p className="text-sm text-charcoal/80">Najpierw dodaj kategorie w zakładce PL.</p>
          ) : (
            <div className="space-y-3">
              {initialCategories.map((c) => (
                <div key={c.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 items-center">
                  <div className="text-sm text-espresso">
                    {c.label}
                    <span className="block text-[11px] font-mono text-charcoal/80">{c.slug}</span>
                  </div>
                  <input
                    type="text"
                    value={labels[c.id] ?? ""}
                    onChange={(e) => setLabels((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder={c.label}
                    className="w-full min-w-0 bg-warm-white border border-sand focus:border-clay outline-none px-3 py-2 text-espresso text-sm"
                    aria-label={`Nazwa angielska: ${c.label}`}
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}
          {toast && <p className="text-sm text-green-700">{toast}</p>}
          <SaveButton onClick={save} label="Zapisz wersję angielską" />
        </div>
      )}
    </div>
  );
}
