"use client";

// Sprzedaż poza sklepem – ręczne wpisy w /admin/analityki.
//
// Kwoty z tych wpisów wchodzą do wykresu miesięcznego, podsumowania rocznego,
// raportu PDF i limitu działalności nierejestrowanej dokładnie tak samo jak
// zamówienia sklepowe. Po każdym zapisie robimy `router.refresh()`, bo liczby
// wyżej na stronie liczone są serwerowo.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Plus, Trash2, Pencil, Loader2, X, Check } from "lucide-react";
import {
  EXTERNAL_SALE_MAX_DESCRIPTION,
  EXTERNAL_SALE_MAX_NOTE,
} from "@/lib/external-sale-validation";

export type ExternalSaleView = {
  id: string;
  soldAt: string;      // ISO – formatowane w komponencie
  description: string;
  amount: number;
  note: string | null;
};

interface Props {
  available: boolean;
  sales: ExternalSaleView[];
  currentYear: number;
  yearTotal: number;
  allTimeTotal: number;
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** ISO → wartość pola `<input type="date">` (YYYY-MM-DD). */
function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = { soldAt: "", description: "", amount: "", note: "" };

export default function ExternalSalesSection({
  available, sales, currentYear, yearTotal, allTimeTotal,
}: Props) {
  const router = useRouter();

  const [open, setOpen]         = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState({ ...EMPTY, soldAt: today() });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]       = useState("");

  function resetForm() {
    setForm({ ...EMPTY, soldAt: today() });
    setEditId(null);
    setError("");
  }

  function startAdd() {
    resetForm();
    setOpen(true);
  }

  function startEdit(s: ExternalSaleView) {
    setForm({
      soldAt: toDateInput(s.soldAt),
      description: s.description,
      amount: String(s.amount),
      note: s.note ?? "",
    });
    setEditId(s.id);
    setError("");
    setOpen(true);
  }

  async function save() {
    const amount = parseFloat(form.amount.replace(",", "."));
    if (!form.description.trim()) { setError("Podaj, czego dotyczy sprzedaż."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setError("Podaj kwotę większą od zera."); return; }
    if (!form.soldAt) { setError("Podaj datę sprzedaży."); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        editId ? `/api/admin/external-sales/${editId}` : "/api/admin/external-sales",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            soldAt: form.soldAt,
            description: form.description.trim(),
            amount,
            note: form.note.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "");
      }
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Nie udało się zapisać – spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: ExternalSaleView) {
    if (!window.confirm(`Usunąć wpis „${s.description}” na ${fmt(s.amount)} zł?`)) return;
    setDeleting(s.id);
    try {
      const res = await fetch(`/api/admin/external-sales/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (editId === s.id) { resetForm(); setOpen(false); }
      router.refresh();
    } catch {
      setError("Nie udało się usunąć wpisu.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="bg-cream border border-sand/60 p-6">
      {/* Nagłówek */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 bg-warm-white border border-sand/60 rounded-full flex items-center justify-center shrink-0">
          <HandCoins size={17} strokeWidth={1.5} className="text-clay" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg text-espresso leading-tight">Sprzedaż poza sklepem</h2>
          <p className="text-xs text-charcoal/80 mt-1">
            Jarmarki, sprzedaż bezpośrednia, zamówienia dogadane poza sklepem. Kwoty wliczają się
            do wykresu, podsumowania rocznego, raportu PDF i limitu działalności nierejestrowanej.
          </p>
        </div>
        {available && !open && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-xs tracking-widest uppercase bg-clay text-warm-white px-3 py-2 hover:bg-terracotta hover:text-espresso transition-colors shrink-0"
          >
            <Plus size={13} strokeWidth={2} />
            Dodaj
          </button>
        )}
      </div>

      {!available ? (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">Brak tabeli w bazie danych</p>
          <p>
            Uruchom migrację <code className="font-mono">prisma/migrations/manual_add_external_sales.sql</code>{" "}
            w Supabase (SQL Editor), a formularz zacznie działać. Do tego czasu analityka pokazuje
            wyłącznie zamówienia ze sklepu.
          </p>
        </div>
      ) : (
        <>
          {/* Formularz */}
          {open && (
            <div className="bg-warm-white border border-sand p-4 mb-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_120px] gap-3">
                <div className="min-w-0">
                  <label className="block text-[10px] tracking-widest uppercase text-charcoal/80 mb-1">
                    Data sprzedaży
                  </label>
                  <input
                    type="date"
                    value={form.soldAt}
                    max={today()}
                    onChange={(e) => setForm({ ...form, soldAt: e.target.value })}
                    className="w-full min-w-0 border border-sand bg-warm-white text-espresso text-xs px-2 py-1.5 outline-none focus:border-clay"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] tracking-widest uppercase text-charcoal/80 mb-1">
                    Czego dotyczy
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    maxLength={EXTERNAL_SALE_MAX_DESCRIPTION}
                    placeholder="np. Jarmark w Gliwicach – 4 kubki i miska"
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full min-w-0 border border-sand bg-warm-white text-espresso text-xs px-2 py-1.5 outline-none focus:border-clay"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] tracking-widest uppercase text-charcoal/80 mb-1">
                    Kwota (zł)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    placeholder="0,00"
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full min-w-0 border border-sand bg-warm-white text-espresso text-xs px-2 py-1.5 outline-none focus:border-clay tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-charcoal/80 mb-1">
                  Notatka (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={form.note}
                  maxLength={EXTERNAL_SALE_MAX_NOTE}
                  placeholder="np. płatność gotówką"
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full min-w-0 border border-sand bg-warm-white text-espresso text-xs px-2 py-1.5 outline-none focus:border-clay"
                />
              </div>

              {error && <p className="text-xs text-red-700">{error}</p>}

              <div className="flex items-center gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs tracking-widest uppercase bg-clay text-warm-white px-3 py-2 hover:bg-terracotta hover:text-espresso transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2} />}
                  {editId ? "Zapisz zmiany" : "Dodaj sprzedaż"}
                </button>
                <button
                  onClick={() => { resetForm(); setOpen(false); }}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-charcoal/80 px-3 py-2 hover:text-espresso transition-colors disabled:opacity-50"
                >
                  <X size={13} strokeWidth={2} />
                  Anuluj
                </button>
              </div>
            </div>
          )}

          {/* Lista wpisów */}
          {sales.length === 0 ? (
            <p className="text-sm text-charcoal/80 py-6 text-center">
              Brak wpisów. Dodaj pierwszą sprzedaż spoza sklepu.
            </p>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto -mx-1 px-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] tracking-widest uppercase text-charcoal/80 border-b border-sand">
                      <th className="text-left font-normal py-2 w-24">Data</th>
                      <th className="text-left font-normal py-2">Opis</th>
                      <th className="text-right font-normal py-2 w-24">Kwota</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s.id} className="border-b border-sand/50">
                        <td className="py-2 text-charcoal/80 tabular-nums align-top">{fmtDate(s.soldAt)}</td>
                        <td className="py-2 text-espresso align-top">
                          {s.description}
                          {s.note && <span className="block text-[11px] text-charcoal/80 mt-0.5">{s.note}</span>}
                        </td>
                        <td className="py-2 text-right text-espresso tabular-nums align-top">{fmt(s.amount)} zł</td>
                        <td className="py-2 align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(s)}
                              title="Edytuj wpis"
                              className="p-1 text-clay hover:text-espresso transition-colors"
                            >
                              <Pencil size={13} strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => remove(s)}
                              disabled={deleting === s.id}
                              title="Usuń wpis"
                              className="p-1 text-clay hover:text-red-700 transition-colors disabled:opacity-50"
                            >
                              {deleting === s.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} strokeWidth={1.5} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-between gap-3 pt-3 mt-1 border-t border-sand text-xs">
                <span className="text-charcoal/80">
                  {sales.length} {sales.length === 1 ? "wpis" : "wpisów"} · łącznie{" "}
                  <span className="text-espresso tabular-nums">{fmt(allTimeTotal)} zł</span>
                </span>
                <span className="text-charcoal/80">
                  W roku {currentYear}:{" "}
                  <span className="text-espresso tabular-nums">{fmt(yearTotal)} zł</span>
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
