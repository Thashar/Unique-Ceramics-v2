"use client";

import { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";

// Stawki PIT skali podatkowej
const TAX_RATE_LOW  = 0.12;
const TAX_RATE_HIGH = 0.32;

export type MonthRow = {
  label: string;
  yr:    number;
  mo:    number;
  cnt:   number;
  rev:   number;  // przychód brutto (z wysyłką)
  ship:  number;  // koszty wysyłki
};

interface Props {
  rows:        MonthRow[];                  // najnowszy miesiąc pierwszy
  highFlags:   Record<string, boolean>;     // klucz `${yr}-${mo}` → true = stawka 32%
  currentYear: number;
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

// Podstawa opodatkowania = przychód z produktów (bez wysyłki)
function taxBase(row: MonthRow): number {
  return Math.round((row.rev - row.ship) * 100) / 100;
}

function taxDue(row: MonthRow, high: boolean): number {
  const rate = high ? TAX_RATE_HIGH : TAX_RATE_LOW;
  return Math.round(taxBase(row) * rate * 100) / 100;
}

export default function MonthlyReportsTable({ rows, highFlags, currentYear }: Props) {
  const [flags, setFlags]   = useState<Record<string, boolean>>(highFlags);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function toggle(yr: number, mo: number, next: boolean) {
    const key      = `${yr}-${mo}`;
    const prev     = flags[key] ?? false;
    setFlags((f) => ({ ...f, [key]: next }));
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key: `tax_high_${yr}_${mo}`, value: next ? "true" : "false" }]),
      });
      if (!res.ok) throw new Error();
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      // przywróć poprzedni stan przy błędzie
      setFlags((f) => ({ ...f, [key]: prev }));
    } finally {
      setSaving((s) => (s === key ? null : s));
    }
  }

  // Suma podatku za bieżący rok (z aktualnych zaznaczeń)
  const yearRows  = rows.filter((r) => r.yr === currentYear);
  const yearBase  = yearRows.reduce((s, r) => s + taxBase(r), 0);
  const yearTax   = yearRows.reduce((s, r) => s + taxDue(r, flags[`${r.yr}-${r.mo}`] ?? false), 0);

  return (
    <div className="mt-6 pt-5 border-t border-sand overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-charcoal/40 tracking-widest uppercase">
            <th className="pb-2 font-normal">Miesiąc</th>
            <th className="pb-2 font-normal text-right">Zamówień</th>
            <th className="pb-2 font-normal text-right">Przychód</th>
            <th className="pb-2 font-normal text-right">Wysyłka</th>
            <th className="pb-2 font-normal text-right">Podstawa</th>
            <th className="pb-2 font-normal text-center">Stawka 32%</th>
            <th className="pb-2 font-normal text-right">Podatek</th>
            <th className="pb-2 font-normal text-right">Raport</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand">
          {rows.map((m) => {
            const key   = `${m.yr}-${m.mo}`;
            const high  = flags[key] ?? false;
            const base  = taxBase(m);
            const tax   = taxDue(m, high);
            const hasOrders = m.cnt > 0;
            return (
              <tr key={`tbl-${key}`} className="text-charcoal/70">
                <td className="py-2 text-espresso font-medium">{m.label || `${m.mo}/${m.yr}`}</td>
                <td className="py-2 text-right tabular-nums">{m.cnt}</td>
                <td className="py-2 text-right tabular-nums">{fmt(m.rev)} zł</td>
                <td className="py-2 text-right tabular-nums text-charcoal/45">{fmt(m.ship)} zł</td>
                <td className="py-2 text-right tabular-nums">{hasOrders ? `${fmt(base)} zł` : "—"}</td>
                <td className="py-2 text-center">
                  {hasOrders ? (
                    <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={high}
                        disabled={saving === key}
                        onChange={(e) => toggle(m.yr, m.mo, e.target.checked)}
                        className="w-3.5 h-3.5 accent-clay cursor-pointer disabled:opacity-40"
                      />
                      {saving === key && <Loader2 size={11} className="animate-spin text-clay" />}
                      {savedKey === key && saving !== key && <Check size={11} className="text-green-600" />}
                    </label>
                  ) : (
                    <span className="text-charcoal/20">—</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {hasOrders ? (
                    <span className={high ? "text-red-600 font-medium" : "text-espresso"}>
                      {fmt(tax)} zł
                      <span className="text-charcoal/35 ml-1">({high ? "32" : "12"}%)</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 text-right">
                  {hasOrders ? (
                    <a
                      href={`/api/admin/reports/${m.yr}/${m.mo}`}
                      className="inline-flex items-center gap-1 text-clay hover:text-espresso transition-colors"
                      title={`Pobierz raport PDF — ${m.label || `${m.mo}/${m.yr}`}`}
                    >
                      <Download size={12} />
                      <span>PDF</span>
                    </a>
                  ) : (
                    <span className="text-charcoal/20">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-sand text-espresso font-semibold">
            <td className="pt-2.5" colSpan={4}>Podatek do odprowadzenia — {currentYear}</td>
            <td className="pt-2.5 text-right tabular-nums">{fmt(yearBase)} zł</td>
            <td className="pt-2.5" />
            <td className="pt-2.5 text-right tabular-nums" colSpan={2}>{fmt(yearTax)} zł</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-[11px] text-charcoal/40 mt-3 leading-relaxed">
        <strong className="font-medium">Podstawa opodatkowania</strong> = przychód z produktów
        (przychód brutto − wysyłka). Wysyłka jest kosztem uzyskania przychodu i nie podlega
        opodatkowaniu. Domyślna stawka PIT to <strong className="font-medium">12%</strong>;
        zaznacz <strong className="font-medium">„Stawka 32%”</strong> dla miesięcy, w których
        dochód roczny przekroczył próg skali podatkowej (120 000 zł). Wybór zapisuje się
        automatycznie i jest uwzględniany w raporcie PDF. Kwoty orientacyjne — ostateczne
        rozliczenie skonsultuj z księgowym.
      </p>
    </div>
  );
}
