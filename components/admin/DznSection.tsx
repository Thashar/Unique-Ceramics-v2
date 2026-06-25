"use client";

import { useState } from "react";
import { Scale, AlertTriangle, Edit2, Check, Loader2 } from "lucide-react";

// Od 2026-01-01: limit = 225% minimalnego wynagrodzenia za kwartał
// (ustawa z 25.07.2025 r. o ograniczeniu biurokracji i wsparciu przedsiębiorczości,
//  zmieniająca art. 5 ustawy Prawo przedsiębiorców)
const DZN_RATIO     = 2.25;
const DZN_WARN_AMB  = 0.75; // 75% → pomarańczowy
const DZN_WARN_RED  = 0.90; // 90% → czerwony

type QuarterData = { rev: number; cnt: number };

const QUARTERS: { q: number; label: string; months: string }[] = [
  { q: 1, label: "Q1", months: "Styczeń – Marzec" },
  { q: 2, label: "Q2", months: "Kwiecień – Czerwiec" },
  { q: 3, label: "Q3", months: "Lipiec – Wrzesień" },
  { q: 4, label: "Q4", months: "Październik – Grudzień" },
];

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

interface Props {
  initialMinWage: number;
  quarterMap: Record<number, QuarterData>;
  currentQuarter: number;
  currentYear: number;
}

export default function DznSection({
  initialMinWage,
  quarterMap,
  currentQuarter,
  currentYear,
}: Props) {
  const [minWage, setMinWage] = useState(initialMinWage);
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState(String(initialMinWage));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  const quarterly = Math.round(minWage * DZN_RATIO * 100) / 100;

  function startEdit() {
    setInput(String(minWage));
    setError("");
    setEditing(true);
  }

  async function save() {
    const parsed = parseInt(input.replace(/\s/g, ""), 10);
    if (isNaN(parsed) || parsed < 1000 || parsed > 20000) {
      setError("Podaj kwotę w zł (np. 4806)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key: "dzn_min_wage", value: String(parsed) }]),
      });
      if (!res.ok) throw new Error();
      setMinWage(parsed);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Nie udało się zapisać — spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className="bg-cream p-6">
      {/* Nagłówek sekcji */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-9 h-9 bg-warm-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <Scale size={17} strokeWidth={1.5} className="text-clay" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg text-espresso leading-tight">
            Działalność nierejestrowana — {currentYear}
          </h2>

          {/* Edytowalne minimalne wynagrodzenie */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-charcoal/45 shrink-0">Minimalne wynagrodzenie:</span>

            {editing ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  autoFocus
                  type="number"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  min={1000}
                  max={20000}
                  className="w-24 border border-clay bg-warm-white text-espresso text-xs px-2 py-1 outline-none tabular-nums"
                />
                <span className="text-xs text-charcoal/45">zł</span>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs bg-clay text-warm-white px-2.5 py-1 hover:bg-espresso transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                  {saving ? "Zapis…" : "Zapisz"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-charcoal/40 hover:text-charcoal transition-colors"
                >
                  Anuluj
                </button>
              </div>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs font-medium text-espresso hover:text-clay transition-colors"
              >
                <span className="tabular-nums">{minWage.toLocaleString("pl-PL")} zł</span>
                <Edit2 size={11} className="text-charcoal/30" />
                {saved && <Check size={11} className="text-green-600 ml-0.5" />}
              </button>
            )}
          </div>

          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

          <p className="text-xs text-charcoal/45 mt-1">
            Limit kwartalny:{" "}
            <span className="font-medium text-charcoal/70 tabular-nums">{fmt(quarterly)} zł</span>
            {" "}· 225% min. wynagrodzenia / kwartał · tylko opłacone zamówienia (z wysyłką)
          </p>
        </div>
      </div>

      {/* Paski kwartalne */}
      <div className="space-y-5">
        {QUARTERS.map(({ q, label, months }) => {
          const data       = quarterMap[q] ?? { rev: 0, cnt: 0 };
          const pctVal     = quarterly > 0 ? (data.rev / quarterly) * 100 : 0;
          const isOverRed  = pctVal >= DZN_WARN_RED  * 100;
          const isOverAmb  = pctVal >= DZN_WARN_AMB  * 100;
          const isCurrent  = q === currentQuarter;

          const barColor = isOverRed
            ? "bg-red-400"
            : isOverAmb
            ? "bg-amber-400"
            : "bg-green-400";

          return (
            <div
              key={q}
              className={`rounded-sm p-3 -mx-1 ${isCurrent ? "bg-warm-white" : ""}`}
            >
              {/* Nagłówek kwartału */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      isOverRed ? "text-red-600" : isOverAmb ? "text-amber-700" : "text-espresso"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[11px] text-charcoal/45">{months}</span>
                  {isCurrent && (
                    <span className="text-[10px] tracking-widest uppercase text-terracotta font-medium">
                      Bieżący
                    </span>
                  )}
                  {isOverRed && (
                    <AlertTriangle size={13} className="text-red-500 shrink-0" />
                  )}
                  {!isOverRed && isOverAmb && (
                    <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0 ml-2">
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      isOverRed ? "text-red-600" : isOverAmb ? "text-amber-700" : "text-espresso"
                    }`}
                  >
                    {fmt(data.rev)} zł
                  </span>
                  <span className="text-xs text-charcoal/40 tabular-nums">
                    ({Math.min(pctVal, 999).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Pasek postępu */}
              <div className="h-2.5 bg-sand rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(pctVal, 100)}%` }}
                />
              </div>

              {/* Podpis */}
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-charcoal/35">
                  {data.cnt > 0 ? `${data.cnt} zamówień` : "Brak zamówień"}
                </p>
                <p className="text-[11px] text-charcoal/35 tabular-nums">
                  {data.rev >= quarterly
                    ? "⚠ Limit przekroczony!"
                    : data.rev > 0
                    ? `Pozostało: ${fmt(quarterly - data.rev)} zł`
                    : `Limit: ${fmt(quarterly)} zł`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stopka prawna */}
      <div className="mt-4 pt-4 border-t border-sand">
        <p className="text-[11px] text-charcoal/35 leading-relaxed">
          <strong className="font-medium">Podstawa prawna:</strong>{" "}
          art. 5 ustawy z dnia 6 marca 2018 r. Prawo przedsiębiorców (Dz.U. 2018 poz. 646),
          zmieniony ustawą z dnia 25 lipca 2025 r. o ograniczeniu biurokracji i wsparciu
          przedsiębiorczości. Od 1 stycznia 2026 r. limit jest <strong className="font-medium">kwartalny</strong>{" "}
          (225% min. wynagrodzenia za kwartał kalendarzowy) — miesiące w kwartale można rozliczać
          nierównomiernie.{" "}
          Pomarańczowy = &gt;{Math.round(DZN_WARN_AMB * 100)}% limitu · Czerwony = &gt;{Math.round(DZN_WARN_RED * 100)}% limitu.{" "}
          Uwaga: przepisy liczą{" "}
          <em>przychód należny</em> (wystawione rachunki/faktury), nie tylko wpływy
          — i obejmuje on <strong className="font-medium">pełną kwotę pobraną od klienta wraz z kosztem
          wysyłki</strong>. Skonsultuj z księgowym.
        </p>
      </div>
    </div>
  );
}
