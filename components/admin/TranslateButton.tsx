"use client";

import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";

/**
 * Przycisk „Przetłumacz przez AI” – wspólny dla wszystkich miejsc w panelu,
 * w których obok polskiej treści stoi jej angielska wersja. Sam trzyma stan
 * „w toku” i komunikat błędu; co dokładnie tłumaczy, mówi `onTranslate`
 * (patrz `lib/admin-translate.ts`). Wynik nadpisuje pola angielskie – dlatego
 * pyta o potwierdzenie, gdy te nie są puste.
 */
export default function TranslateButton({
  onTranslate,
  hasContent = false,
  label = "Przetłumacz przez AI",
  className = "",
}: {
  onTranslate: () => Promise<void>;
  /** Czy pola angielskie mają już treść – wtedy pytamy przed nadpisaniem. */
  hasContent?: boolean;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (busy) return;
    if (hasContent && !confirm("Angielska treść zostanie nadpisana tłumaczeniem z AI. Kontynuować?")) return;
    setBusy(true);
    setError("");
    try {
      await onTranslate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się przetłumaczyć.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 border border-clay text-clay hover:bg-clay hover:text-cream text-xs tracking-widest uppercase px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Languages size={14} aria-hidden="true" />}
        {busy ? "Tłumaczę…" : label}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
