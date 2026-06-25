"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Pencil, X } from "lucide-react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Date → wartość pola <input type="datetime-local"> (czas lokalny)
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PaidAtEditor({
  orderId,
  paidAt,
}: {
  orderId: string;
  paidAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(toLocalInput(paidAt ? new Date(paidAt) : new Date()));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  const formatted = paidAt
    ? new Date(paidAt).toLocaleString("pl-PL", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  function startEdit() {
    setValue(toLocalInput(paidAt ? new Date(paidAt) : new Date()));
    setError("");
    setEditing(true);
  }

  async function save() {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      setError("Nieprawidłowa data.");
      return;
    }
    if (!window.confirm(
      `Zmienić datę wpłaty na ${d.toLocaleString("pl-PL")}?\n` +
      `Wpłynie to na miesiąc rozliczenia i raport PDF.`
    )) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAt: d.toISOString() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "");
      }
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-[11px] tracking-widest uppercase text-charcoal/45 mb-1">Data wpłaty (rozliczenie)</p>
      {editing ? (
        <div className="space-y-2">
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={saving}
            className="w-full border border-clay bg-warm-white text-espresso text-xs px-2 py-1.5 rounded-sm outline-none disabled:opacity-60"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 text-xs bg-clay text-warm-white px-3 py-1 rounded-sm hover:bg-espresso transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {saving ? "Zapis…" : "Zapisz"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="inline-flex items-center gap-1 text-xs text-charcoal/45 hover:text-charcoal transition-colors"
            >
              <X size={11} /> Anuluj
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-espresso font-medium">{formatted}</span>
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1 text-[11px] text-clay hover:text-espresso transition-colors"
            title="Zmień datę wpłaty"
          >
            <Pencil size={11} /> Zmień
          </button>
          {saved && <Check size={12} className="text-green-600" />}
        </div>
      )}
    </div>
  );
}
