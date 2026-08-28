"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Category } from "@/lib/category-defaults";
import { categoryDescription, categoryIntroKey, categoryPath } from "@/lib/category-seo";

/** Tyle Google pokazuje pod tytułem – dłuższy opis utnie w połowie zdania. */
const SHOWN_LENGTH = 160;
/** Twardy limit pola: zapas na dokończenie myśli, reszta i tak nie wejdzie. */
const MAX_LENGTH = 300;

/**
 * Opisy kategorii **dla wyszukiwarki**: tekst trafia do `<meta description>`
 * i do danych strukturalnych, ale **nie jest drukowany na stronie**
 * (decyzja właściciela 28.08.2026). To jedyny legalny sposób na tekst
 * „widoczny tylko w wyszukiwarce” – ukryty akapit na stronie byłby cloakingiem.
 *
 * Puste pole = opis układany z nazwy kategorii (podpowiedź pokazuje dokładnie
 * ten tekst). Własny jest wart więcej: szablon powtarza się na każdej kategorii.
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
      <h2 className="font-serif text-2xl text-espresso mb-2">Opisy kategorii dla wyszukiwarki</h2>
      <p className="text-sm text-charcoal/80 mb-6">
        Tekst, który Google pokazuje pod tytułem strony w wynikach wyszukiwania.
        <strong> Na samej stronie nie jest widoczny.</strong> Puste pole = opis układany
        automatycznie z nazwy kategorii (widoczny jako podpowiedź). Własny jest lepszy –
        wyszukiwarki nisko oceniają teksty powtarzalne. Zmieść się w {SHOWN_LENGTH} znakach,
        bo dłuższy zostanie ucięty.
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
              placeholder={categoryDescription(cat.label)}
              maxLength={MAX_LENGTH}
              rows={3}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors resize-y"
            />
            {/* Licznik ostrzega dopiero po przekroczeniu tego, co widać w wyniku */}
            <p className="mt-1 text-[11px] text-charcoal/80 tabular-nums">
              {(values[cat.slug] ?? "").length} / {SHOWN_LENGTH} znaków
              {(values[cat.slug] ?? "").length > SHOWN_LENGTH && " – nadmiar zostanie ucięty"}
            </p>
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
