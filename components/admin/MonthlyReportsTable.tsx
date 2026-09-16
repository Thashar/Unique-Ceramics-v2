"use client";

// Tabela miesięczna w /admin/analityki: przychód, VAT, koszty, podstawa, PIT,
// składka zdrowotna, raport PDF. Liczy **w przeglądarce** przez `lib/tax.ts`
// (te same funkcje co raport PDF), więc zmiana kosztów albo checkboxa 32%
// przelicza tabelę od razu, bez odświeżania strony.
//
// Kolumny zależą od trybu (`TaxConfig`):
//  • działalność nierejestrowana – podstawa = przychód z produktów, checkbox
//    „Stawka 32%" per miesiąc (zachowanie sprzed 16.09.2026);
//  • działalność gospodarcza – edytowalne koszty (skala/liniowy), dochód,
//    zaliczka PIT liczona narastająco w roku, składka zdrowotna, ZUS;
//  • VAT (w obu trybach) – kolumny „VAT należny" i „Netto".
//
// Dostajemy wszystkie miesiące od stycznia **poprzedniego** roku, choć
// pokazujemy ostatnie 12 – skala w JDG liczy zaliczki narastająco, więc luty
// trzeba policzyć po styczniu, nawet gdy stycznia nie widać.

import { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import {
  TAX_FORM_LABELS,
  computeYear,
  costsKey,
  highKey,
  summarizeYear,
  type MonthInput,
  type MonthResult,
  type TaxConfig,
} from "@/lib/tax";

interface Props {
  /** Wszystkie miesiące rosnąco (od stycznia poprzedniego roku do bieżącego). */
  months: MonthInput[];
  /** Ile ostatnich miesięcy pokazać. */
  showCount: number;
  config: TaxConfig;
  currentYear: number;
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

async function saveSetting(key: string, value: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ key, value }]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function MonthlyReportsTable({ months, showCount, config, currentYear }: Props) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(months.map((m) => [`${m.yr}-${m.mo}`, m.high]))
  );
  const [costs, setCosts] = useState<Record<string, number>>(() =>
    Object.fromEntries(months.map((m) => [`${m.yr}-${m.mo}`, m.costs]))
  );
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registered = config.mode === "registered";
  const showCosts = registered && config.form !== "lump";
  const showHighFlag = !registered;
  const vat = config.vatEnabled;

  // Liczymy każdy rok osobno (zaliczki narastają od stycznia), potem sklejamy
  const byYear = new Map<number, MonthInput[]>();
  for (const m of months) {
    const key = `${m.yr}-${m.mo}`;
    const input: MonthInput = { ...m, high: flags[key] ?? m.high, costs: costs[key] ?? m.costs };
    byYear.set(m.yr, [...(byYear.get(m.yr) ?? []), input]);
  }
  const results: MonthResult[] = [...byYear.keys()]
    .sort((a, b) => a - b)
    .flatMap((yr) => computeYear(byYear.get(yr)!, config));
  const visible = results.slice(-showCount).reverse();
  const year = summarizeYear(results.filter((r) => r.yr === currentYear));

  function flash(key: string) {
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
  }

  async function toggleHigh(yr: number, mo: number, next: boolean) {
    const key = `${yr}-${mo}`;
    const prev = flags[key] ?? false;
    setFlags((f) => ({ ...f, [key]: next }));
    setSaving(key);
    setError(null);
    const ok = await saveSetting(highKey(yr, mo), next ? "true" : "false");
    if (!ok) {
      setFlags((f) => ({ ...f, [key]: prev }));
      setError("Nie udało się zapisać stawki – spróbuj ponownie.");
    } else {
      flash(key);
    }
    setSaving((s) => (s === key ? null : s));
  }

  async function commitCosts(yr: number, mo: number) {
    const key = `${yr}-${mo}`;
    const draft = costDrafts[key];
    if (draft === undefined) return;
    const parsed = Math.max(0, Math.round(Number(draft.replace(",", ".")) * 100) / 100);
    const value = Number.isFinite(parsed) ? parsed : 0;
    setCostDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    if (value === (costs[key] ?? 0)) return;
    const prev = costs[key] ?? 0;
    setCosts((c) => ({ ...c, [key]: value }));
    setSaving(key);
    setError(null);
    const ok = await saveSetting(costsKey(yr, mo), String(value));
    if (!ok) {
      setCosts((c) => ({ ...c, [key]: prev }));
      setError("Nie udało się zapisać kosztów – spróbuj ponownie.");
    } else {
      flash(key);
    }
    setSaving((s) => (s === key ? null : s));
  }

  const th = "pb-2 font-normal";
  const num = "py-2 text-right tabular-nums";

  return (
    <div className="mt-6 pt-5 border-t border-sand overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-charcoal/80 tracking-widest uppercase">
            <th className={th}>Miesiąc</th>
            <th className={`${th} text-right`}>Sprzedaży</th>
            <th className={`${th} text-right`}>{vat ? "Brutto" : "Przychód"}</th>
            {vat && <th className={`${th} text-right`}>VAT nal.</th>}
            {vat && <th className={`${th} text-right`}>Netto</th>}
            <th className={`${th} text-right`}>Wysyłka</th>
            {showCosts && <th className={`${th} text-right`}>Koszty</th>}
            <th className={`${th} text-right`}>{registered && config.form !== "lump" ? "Dochód" : "Podstawa"}</th>
            {showHighFlag && <th className={`${th} text-center`}>Stawka 32%</th>}
            <th className={`${th} text-right`}>PIT</th>
            {registered && <th className={`${th} text-right`}>Zdrowotna</th>}
            <th className={`${th} text-right`}>Raport</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand">
          {visible.map((m) => {
            const key = `${m.yr}-${m.mo}`;
            const hasSales = m.cnt > 0 || m.rev > 0;
            const label = m.mo === 1 || m.yr !== currentYear
              ? `${MONTH_SHORT[m.mo - 1]} ${m.yr}`
              : MONTH_SHORT[m.mo - 1];
            const busy = saving === key;
            return (
              <tr key={key} className="text-charcoal/80">
                <td className="py-2 text-espresso font-medium whitespace-nowrap">
                  {label}
                  {busy && <Loader2 size={11} className="inline ml-1.5 animate-spin text-clay" />}
                  {savedKey === key && !busy && <Check size={11} className="inline ml-1.5 text-green-700" />}
                </td>
                <td className={num}>{m.cnt}</td>
                <td className={num}>{fmt(m.rev)} zł</td>
                {vat && <td className={`${num} text-charcoal/80`}>{hasSales ? `${fmt(m.vatDue)} zł` : "–"}</td>}
                {vat && <td className={num}>{hasSales ? `${fmt(m.revNet)} zł` : "–"}</td>}
                <td className={`${num} text-charcoal/80`}>{fmt(vat ? m.shipNet : m.ship)} zł</td>
                {showCosts && (
                  <td className={num}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={costDrafts[key] ?? (costs[key] ? String(costs[key]).replace(".", ",") : "")}
                      placeholder="0"
                      onChange={(e) => setCostDrafts((d) => ({ ...d, [key]: e.target.value }))}
                      onBlur={() => commitCosts(m.yr, m.mo)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      disabled={busy}
                      aria-label={`Koszty – ${label}`}
                      className="w-20 bg-warm-white border border-sand text-espresso text-xs px-1.5 py-0.5 text-right outline-none focus:border-clay tabular-nums disabled:opacity-50"
                    />
                    <span className="ml-1">zł</span>
                  </td>
                )}
                <td className={`${num} ${m.base < 0 ? "text-red-700" : ""}`}>
                  {hasSales || m.costs > 0 ? `${fmt(m.base)} zł` : "–"}
                </td>
                {showHighFlag && (
                  <td className="py-2 text-center">
                    {hasSales ? (
                      <input
                        type="checkbox"
                        checked={flags[key] ?? false}
                        disabled={busy}
                        onChange={(e) => toggleHigh(m.yr, m.mo, e.target.checked)}
                        aria-label={`Stawka 32% – ${label}`}
                        className="w-3.5 h-3.5 accent-clay cursor-pointer disabled:opacity-40"
                      />
                    ) : (
                      <span className="text-charcoal/80">–</span>
                    )}
                  </td>
                )}
                <td className={num}>
                  {hasSales ? (
                    <span className={m.rateLabel === "32%" ? "text-red-700 font-medium" : "text-espresso"}>
                      {fmt(m.pit)} zł
                      <span className="text-charcoal/80 ml-1">({m.rateLabel})</span>
                    </span>
                  ) : "–"}
                </td>
                {registered && <td className={`${num} text-charcoal/80`}>{hasSales ? `${fmt(m.health)} zł` : "–"}</td>}
                <td className="py-2 text-right">
                  {hasSales ? (
                    <a
                      href={`/api/admin/reports/${m.yr}/${m.mo}`}
                      className="inline-flex items-center gap-1 text-clay hover:text-espresso transition-colors"
                      title={`Pobierz raport PDF – ${label}`}
                    >
                      <Download size={12} />
                      <span>PDF</span>
                    </a>
                  ) : (
                    <span className="text-charcoal/80">–</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}

      {/* ── Rozliczenie roczne ──────────────────────────────────────────── */}
      <div className="mt-5 pt-4 border-t-2 border-sand">
        <p className="text-[11px] tracking-widest uppercase text-charcoal/80 mb-3">
          Rozliczenie {currentYear} · {registered ? TAX_FORM_LABELS[config.form] : "działalność nierejestrowana"}
          {vat ? ` · VAT ${String(config.vatRate).replace(".", ",")}%` : " · bez VAT"}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          <Stat label={vat ? "Przychód brutto" : "Przychód"} value={year.rev} />
          {vat && <Stat label="VAT należny" value={year.vatDue} />}
          {vat && <Stat label="Przychód netto" value={year.revNet} />}
          <Stat label="Wysyłka" value={vat ? year.shipNet : year.ship} muted />
          {showCosts && <Stat label="Koszty" value={year.costs} muted />}
          {registered && config.zusSocialMonthly > 0 && <Stat label="ZUS społeczne" value={year.zusSocial} muted />}
          <Stat label={registered && config.form !== "lump" ? "Dochód" : "Podstawa PIT"} value={year.base} />
          <Stat label="PIT do zapłaty" value={year.pit} strong />
          {registered && <Stat label="Składka zdrowotna" value={year.health} strong />}
          {registered && <Stat label="Razem daniny" value={year.pit + year.health + year.zusSocial + year.vatDue} strong />}
        </div>
      </div>

      <p className="text-[11px] text-charcoal/80 mt-4 leading-relaxed">
        {registered ? (
          <>
            {config.form === "lump" ? (
              <><strong className="font-medium">Ryczałt</strong> liczy podatek od przychodu (z wysyłką) pomniejszonego o ZUS społeczne
              i połowę składki zdrowotnej – koszty nie mają znaczenia. Składka zdrowotna zależy od progów przychodu rocznego (60 000 / 300 000 zł). </>
            ) : (
              <><strong className="font-medium">Dochód</strong> = przychód z produktów{vat ? " (netto)" : ""} − koszty − ZUS społeczne
              {config.form === "linear" ? " − składka zdrowotna (do rocznego limitu)" : ""}. Koszty wpisujesz w tabeli (glina, szkliwa, prąd do pieca, paczki…) – zapisują się same.{" "}
              {config.form === "scale"
                ? "Zaliczka PIT liczona narastająco: kwota wolna 30 000 zł, 12% do 120 000 zł dochodu, 32% powyżej – bez ręcznego zaznaczania stawki. "
                : "PIT 19% od dochodu. "}
              Składka zdrowotna: {config.form === "scale" ? "9%" : "4,9%"} dochodu, nie mniej niż 9% z 75% płacy minimalnej. </>
            )}
            {vat && "VAT należny to podatek od sprzedaży – księgowość odejmie od niego VAT naliczony z zakupów. "}
            Kwoty orientacyjne – ostateczne rozliczenie skonsultuj z księgowym. Stawki i progi zmieniasz w Ustawieniach → Podatki.
          </>
        ) : (
          <>
            <strong className="font-medium">Podstawa opodatkowania</strong> = przychód z produktów{vat ? " netto" : ""} (przychód − wysyłka).
            Wysyłka jest kosztem uzyskania przychodu i nie podlega opodatkowaniu. Domyślna stawka PIT to{" "}
            <strong className="font-medium">12%</strong>; zaznacz <strong className="font-medium">„Stawka 32%”</strong> dla miesięcy,
            w których dochód roczny przekroczył próg skali (120 000 zł). Wybór zapisuje się automatycznie i jest uwzględniany w raporcie PDF.
            Kwoty orientacyjne – ostateczne rozliczenie skonsultuj z księgowym. Tryb działalności zmieniasz w Ustawieniach → Podatki.
          </>
        )}
      </p>
    </div>
  );
}

const MONTH_SHORT = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

function Stat({ label, value, muted = false, strong = false }: { label: string; value: number; muted?: boolean; strong?: boolean }) {
  return (
    <div>
      <p className={`font-serif tabular-nums ${strong ? "text-xl text-espresso" : muted ? "text-lg text-charcoal/80" : "text-lg text-espresso"}`}>
        {fmt(value)} zł
      </p>
      <p className="text-[11px] tracking-widest uppercase text-charcoal/80 mt-1">{label}</p>
    </div>
  );
}
