"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { MAX_CODE_PERCENT, codeState, normalizeCode } from "@/lib/discount-code";
import { dateToWarsawLocal, formatWarsaw, warsawLocalToDate } from "@/lib/warsaw-time";

const HOUR_MS = 3_600_000;

/** Te same gotowe czasy, co przy rabacie w karcie produktu. */
const DURATIONS: { value: string; label: string }[] = [
  { value: "", label: "Bezterminowo" },
  { value: "24", label: "24 godziny" },
  { value: "48", label: "2 dni" },
  { value: "72", label: "3 dni" },
  { value: "168", label: "7 dni" },
  { value: "336", label: "14 dni" },
  { value: "720", label: "30 dni" },
  { value: "custom", label: "Do wskazanej daty" },
];

export type DiscountCodeDraft = {
  code: string;
  percent: number;
  active: boolean;
  stackable: boolean;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

export default function DiscountCodeForm({
  id,
  initial,
}: {
  /** Brak = nowy kod (POST); podany = edycja (PUT + usuwanie). */
  id?: string;
  initial?: DiscountCodeDraft;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    code: initial?.code ?? "",
    percent: initial?.percent?.toString() ?? "10",
    active: initial?.active ?? true,
    stackable: initial?.stackable ?? true,
    // Daty trzymamy w formacie <input type="datetime-local">, czyli w czasie
    // polskim; na UTC przeliczamy je dopiero przy zapisie
    startsAt: dateToWarsawLocal(initial?.startsAt),
    endsAt: dateToWarsawLocal(initial?.endsAt),
  });
  const [durationPreset, setDurationPreset] = useState(initial?.endsAt ? "custom" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const percent = Number.parseInt(form.percent, 10);
  const startsAtDate = form.startsAt ? warsawLocalToDate(form.startsAt) : null;
  const endsAtDate = form.endsAt ? warsawLocalToDate(form.endsAt) : null;
  const windowError =
    (form.startsAt && !startsAtDate) || (form.endsAt && !endsAtDate)
      ? "Nieprawidłowa data."
      : startsAtDate && endsAtDate && endsAtDate.getTime() <= startsAtDate.getTime()
        ? "Koniec musi być późniejszy niż początek."
        : "";

  const summary = (() => {
    if (windowError) return "";
    const state = codeState({
      code: form.code,
      percent: Number.isFinite(percent) ? percent : 0,
      stackable: form.stackable,
      active: form.active,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
    });
    if (state === "inactive") return "Kod jest wyłączony – klient go nie użyje.";
    if (state === "expired") return `Kod zakończył się ${formatWarsaw(endsAtDate)}.`;
    if (state === "scheduled") {
      return endsAtDate
        ? `Kod zadziała od ${formatWarsaw(startsAtDate)} do ${formatWarsaw(endsAtDate)}.`
        : `Kod zadziała od ${formatWarsaw(startsAtDate)}, bezterminowo.`;
    }
    return endsAtDate
      ? `Kod działa do ${formatWarsaw(endsAtDate)}.`
      : "Kod działa bezterminowo – do chwili wyłączenia go tutaj.";
  })();

  function endAfterHours(hours: number, startLocal: string): string {
    const from = warsawLocalToDate(startLocal) ?? new Date();
    return dateToWarsawLocal(new Date(from.getTime() + hours * HOUR_MS));
  }

  function setStart(value: string) {
    set("startsAt", value);
    if (durationPreset && durationPreset !== "custom") {
      set("endsAt", endAfterHours(Number(durationPreset), value));
    }
  }

  function setDuration(preset: string) {
    setDurationPreset(preset);
    if (preset === "") {
      set("endsAt", "");
      return;
    }
    if (preset === "custom") {
      if (!form.endsAt) set("endsAt", endAfterHours(168, form.startsAt));
      return;
    }
    set("endsAt", endAfterHours(Number(preset), form.startsAt));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (windowError) {
      setError(windowError);
      return;
    }
    setSaving(true);

    const res = await fetch(
      id ? `/api/admin/discount-codes/${id}` : "/api/admin/discount-codes",
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalizeCode(form.code),
          percent: Number.parseInt(form.percent, 10),
          active: form.active,
          stackable: form.stackable,
          startsAt: startsAtDate ? startsAtDate.toISOString() : null,
          endsAt: endsAtDate ? endsAtDate.toISOString() : null,
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nie udało się zapisać kodu");
      setSaving(false);
      return;
    }

    router.push("/admin/kody-rabatowe");
    router.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm(`Usunąć kod ${form.code}? Zamówienia, w których go użyto, zostają bez zmian.`)) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/discount-codes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nie udało się usunąć kodu");
      setSaving(false);
      return;
    }
    router.push("/admin/kody-rabatowe");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="min-w-0">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Kod *</label>
          <input
            required
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="LATO10"
            className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono uppercase tracking-wider"
          />
          <p className="text-[11px] text-charcoal/80 mt-1">
            3–32 znaki: wielkie litery, cyfry i myślniki w środku.
          </p>
        </div>
        <div className="min-w-0">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Rabat (%) *
          </label>
          <input
            required
            type="number"
            min="1"
            max={MAX_CODE_PERCENT}
            step="1"
            value={form.percent}
            onChange={(e) => set("percent", e.target.value)}
            className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
          />
          <p className="text-[11px] text-charcoal/80 mt-1">Od 1 do {MAX_CODE_PERCENT}%.</p>
        </div>
      </div>

      {/* Okno obowiązywania – identyczne jak przy rabacie w karcie produktu */}
      <div className="border border-sand/60 bg-warm-white p-4">
        <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">
          Czas obowiązywania <span className="text-clay">(czas polski)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="min-w-0">
            <label className="block text-[11px] text-charcoal/80 mb-1.5">Start</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setStart(e.target.value)}
              className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
            />
            <p className="text-[11px] text-charcoal/80 mt-1">Puste = od zapisania.</p>
          </div>
          <div className="min-w-0">
            <label className="block text-[11px] text-charcoal/80 mb-1.5">Czas trwania</label>
            <select
              value={durationPreset}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
            >
              {DURATIONS.map((d) => (
                <option key={d.value || "none"} value={d.value}>{d.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-charcoal/80 mt-1">Wypełnia pole „Do kiedy”.</p>
          </div>
          <div className="min-w-0">
            <label className="block text-[11px] text-charcoal/80 mb-1.5">Do kiedy</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => {
                set("endsAt", e.target.value);
                setDurationPreset(e.target.value ? "custom" : "");
              }}
              className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
            />
            <p className="text-[11px] text-charcoal/80 mt-1">Puste = bezterminowo.</p>
          </div>
        </div>
        {windowError ? (
          <p className="text-xs text-red-700 mt-3">{windowError}</p>
        ) : (
          <p className="text-xs text-espresso mt-3">{summary}</p>
        )}
      </div>

      {/* Zasady łączenia */}
      <div className="border border-sand/60 bg-warm-white p-4 space-y-3">
        <label className="flex items-start gap-3 text-sm text-espresso cursor-pointer">
          <input
            type="checkbox"
            checked={form.stackable}
            onChange={(e) => set("stackable", e.target.checked)}
            className="mt-0.5 accent-clay shrink-0"
          />
          <span>
            Łączy się z innymi rabatami
            <span className="block text-xs text-charcoal/80 mt-1 leading-relaxed">
              Zaznaczone: kod schodzi dodatkowo z cen już przecenionych, a promocja
              „Wielosztuki” działa normalnie – rabaty się sumują.
              Odznaczone: kod działa sam (bez przecen produktów i bez „Wielosztuk”),
              a sklep porównuje obie kwoty i zostawia <strong>korzystniejszą dla klienta</strong>.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-espresso cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
            className="mt-0.5 accent-clay shrink-0"
          />
          <span>
            Kod aktywny
            <span className="block text-xs text-charcoal/80 mt-1">
              Odznaczenie wyłącza kod od razu, niezależnie od dat.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso disabled:opacity-50 text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {id ? "Zapisz zmiany" : "Dodaj kod"}
        </button>
        {id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 border border-sand text-red-700 hover:bg-red-50 disabled:opacity-50 text-xs tracking-widest uppercase px-4 py-3 transition-colors"
          >
            <Trash2 size={14} strokeWidth={1.5} />
            Usuń kod
          </button>
        )}
      </div>
    </form>
  );
}
