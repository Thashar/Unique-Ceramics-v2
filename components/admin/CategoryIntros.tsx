"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Category } from "@/lib/category-defaults";
import { categoryIntro, categoryIntroKey, categoryPath } from "@/lib/category-seo";

/** Tyle znaków wystarcza na dwa–trzy zdania; dłuższy tekst i tak nikt nie czyta. */
const MAX_LENGTH = 800;

/**
 * Opisy stron kategorii (`/sklep/kategoria/…`) – tekst pod nagłówkiem, który
 * czyta klient **i** wyszukiwarka.
 *
 * Puste pole nie zostawia pustej strony: wtedy wchodzi tekst generowany z nazwy
 * kategorii (podpowiedź w polu pokazuje dokładnie ten tekst). Własny opis jest
 * jednak wart więcej – szablon powtarza się na każdej kategorii.
 *
 * Zapis idzie przez zwykłe ustawienia (`category_intro_{slug}`), więc nie
 * wymagał zmian w bazie, a `/api/admin/settings` odświeża przy okazji strony.
 */
export default function CategoryIntros({
  categories,
  initial,
}: {
  categories: Category[];
  /** Zapisane opisy: slug → tekst. */
  initial: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          categories.map((c) => ({
            key: categoryIntroKey(c.slug),
            value: (values[c.slug] ?? "").trim().slice(0, MAX_LENGTH),
          }))
        ),
      });
      setMessage(res.ok ? "Zapisano opisy kategorii" : "Nie udało się zapisać");
    } catch {
      setMessage("Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  };

  if (categories.length === 0) return null;

  return (
    <section className="mt-12 max-w-2xl">
      <h2 className="font-serif text-2xl text-espresso mb-2">Opisy kategorii</h2>
      <p className="text-sm text-charcoal/80 mb-6">
        Tekst pod nagłówkiem na stronie kategorii. Puste pole = tekst układany automatycznie
        z nazwy kategorii (widoczny jako podpowiedź). Własny opis jest lepszy – wyszukiwarki
        nisko oceniają teksty powtarzalne.
      </p>

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.id}>
            <label className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-xs tracking-widest uppercase text-charcoal/80">
                {cat.label}
              </span>
              <span className="text-[11px] text-charcoal/80 font-mono">
                {categoryPath(cat.slug)}
              </span>
            </label>
            <textarea
              value={values[cat.slug] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [cat.slug]: e.target.value }))
              }
              placeholder={categoryIntro(cat.label)}
              maxLength={MAX_LENGTH}
              rows={4}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors resize-y"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={save}
          disabled={saving}
          aria-busy={saving}
          className="inline-flex items-center gap-2 bg-clay hover:bg-espresso text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors disabled:cursor-wait disabled:hover:bg-clay"
        >
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          Zapisz opisy
        </button>
        {message && <p className="text-sm text-charcoal/80">{message}</p>}
      </div>
    </section>
  );
}
