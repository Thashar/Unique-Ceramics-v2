"use client";

import type { Locale } from "@/lib/i18n";

/**
 * Przełącznik PL / EN w panelu – u góry po prawej sekcji ustawień i formularzy
 * produktu, projektu oraz kategorii. Nie zapisuje niczego sam: tylko decyduje,
 * które pola (polskie czy angielskie) są widoczne w formularzu pod spodem.
 */
export default function LangSwitch({
  value,
  onChange,
  className = "",
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
}) {
  const options: { code: Locale; label: string; title: string }[] = [
    { code: "pl", label: "PL", title: "Treść po polsku" },
    { code: "en", label: "EN", title: "Treść po angielsku (wersja /en)" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Język treści"
      className={`inline-flex border border-sand bg-warm-white text-xs tracking-widest uppercase ${className}`}
    >
      {options.map((opt) => {
        const active = opt.code === value;
        return (
          <button
            key={opt.code}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.title}
            onClick={() => onChange(opt.code)}
            className={`px-3 py-1.5 transition-colors ${
              active ? "bg-espresso text-cream" : "text-charcoal/80 hover:text-espresso hover:bg-cream"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
