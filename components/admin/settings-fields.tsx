"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Pola i przycisk zapisu wspólne dla `SettingsForm` (treść po polsku)
 * i `SettingsEnglish` (ta sama sekcja po angielsku) – wyniesione z formularza,
 * żeby oba pliki nie importowały się nawzajem.
 */

export function Field({ label, value, setter, type = "text", placeholder, mono }: {
  label: string;
  value: string;
  setter: (v: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors${mono ? " font-mono" : ""}`}
      />
    </div>
  );
}

/** Pole wieloliniowe – Enter wstawia nowy wiersz zachowywany przy renderze. */
export function MultilineField({ label, value, setter, placeholder, rows = 3 }: {
  label: string;
  value: string;
  setter: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors resize-y"
      />
    </div>
  );
}

/**
 * Zapis idzie do API, więc przycisk sam pilnuje stanu „w toku”: kręcące się kółko
 * daje znać, że kliknięcie zostało przyjęte, a blokada chroni przed dublowaniem zapisu.
 */
export function SaveButton({ onClick, label }: { onClick: () => void | Promise<void>; label: string }) {
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onClick();
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      aria-busy={saving}
      className="inline-flex items-center gap-2 bg-clay hover:bg-espresso text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors disabled:cursor-wait disabled:hover:bg-clay"
    >
      {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {label}
    </button>
  );
}
