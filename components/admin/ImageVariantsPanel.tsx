"use client";

import { useState } from "react";
import { Loader2, ImageDown, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { IMAGE_VARIANT_WIDTHS } from "@/lib/image-variants";

/**
 * Panel migracji zdjęć (Ustawienia → Zdjęcia).
 *
 * Sklep nie korzysta z optymalizatora obrazów Vercela – rozmiary generujemy sami przy
 * wgrywaniu zdjęcia (powód: „Rozmiary zdjęć” w CLAUDE.md). Zdjęcia wgrane **wcześniej**
 * wariantów nie mają, więc `srcSet` prowadzi do nieistniejących plików i kadr zostaje
 * pusty. Ten przycisk je uzupełnia.
 *
 * Praca idzie **partiami**: jedno żądanie przetwarza kilka zdjęć i zwraca, ile zostało,
 * a komponent woła je w pętli aż do zera. Inaczej migracja całego katalogu przekroczyłaby
 * limit czasu funkcji serverless i przerwałaby się w połowie bez śladu.
 */

type Status = { total: number; pending: number };
type Failed = { name: string; reason: string };
type Batch = { processed: number; remaining: number; failed: Failed[] };

export default function ImageVariantsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<Failed[]>([]);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/image-variants");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Nie udało się odczytać stanu.");
      setStatus(data);
      setFinished(false);
      setDone(0);
      setFailed([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się odczytać stanu.");
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    setRunning(true);
    setError("");
    setFinished(false);
    setDone(0);
    setFailed([]);

    let processedTotal = 0;
    // Mapa po nazwie pliku – to samo zdjęcie wraca w kolejnych partiach, dopóki
    // mu się nie uda, a powtórzona pozycja tylko rozmywałaby listę
    const problems = new Map<string, string>();

    try {
      // Pętla kończy się, gdy nie zostaje nic do zrobienia **albo** gdy partia nie
      // ruszyła ani jednego zdjęcia – inaczej same błędy kręciłyby ją w nieskończoność,
      // bo nieudane zdjęcie nadal nie ma wariantów i wraca na listę
      for (;;) {
        const res = await fetch("/api/admin/image-variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Nie udało się przetworzyć zdjęć.");

        const batch = data as Batch;
        processedTotal += batch.processed;
        batch.failed.forEach(({ name, reason }) => problems.set(name, reason));
        setDone(processedTotal);
        setFailed([...problems].map(([name, reason]) => ({ name, reason })));
        setStatus((prev) => (prev ? { ...prev, pending: batch.remaining } : prev));

        if (batch.remaining === 0 || batch.processed === 0) break;
      }
      setFinished(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się przetworzyć zdjęć.");
    } finally {
      setRunning(false);
    }
  }

  // Gdy wszystkie zdjęcia padły z tego samego powodu (typowo: jedna przyczyna po
  // stronie serwera), lista nazw niczego nie wnosi – wystarczy jeden komunikat
  const commonReason =
    failed.length > 1 && failed.every((f) => f.reason === failed[0].reason)
      ? failed[0].reason
      : "";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-espresso">Rozmiary zdjęć</h2>
        <p className="text-xs text-charcoal/80 leading-relaxed mt-2">
          Każde zdjęcie ze sklepu ma obok siebie mniejsze wersje
          ({IMAGE_VARIANT_WIDTHS.join(", ")} px) – przeglądarka pobiera tę, która pasuje do
          ekranu, zamiast pełnego pliku. Nowe zdjęcia dostają je same, przy wgrywaniu.
          Zdjęcia wgrane wcześniej trzeba uzupełnić raz, tym przyciskiem.
        </p>
      </div>

      <div className="border border-sand p-4 space-y-4">
        {!status && (
          <button
            type="button"
            onClick={loadStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-clay text-clay text-xs tracking-widest uppercase transition-colors hover:bg-clay hover:text-warm-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sprawdź zdjęcia
          </button>
        )}

        {status && (
          <>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[11px] tracking-widest uppercase text-charcoal/80">
                  Zdjęć w magazynie
                </dt>
                <dd className="text-espresso tabular-nums mt-1">{status.total}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-widest uppercase text-charcoal/80">
                  Bez mniejszych wersji
                </dt>
                <dd className="text-espresso tabular-nums mt-1">{status.pending}</dd>
              </div>
            </dl>

            {status.pending > 0 && (
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2 bg-clay text-warm-white text-xs tracking-widest uppercase transition-colors hover:bg-terracotta hover:text-espresso disabled:opacity-50"
              >
                {running ? <Loader2 size={14} className="animate-spin" /> : <ImageDown size={14} />}
                {running ? `Przetwarzam… (${done})` : "Uzupełnij brakujące rozmiary"}
              </button>
            )}

            {status.pending === 0 && !running && (
              <p className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle2 size={16} />
                Wszystkie zdjęcia mają komplet rozmiarów.
              </p>
            )}

            {running && (
              <p className="text-[11px] text-charcoal/80">
                Zdjęcia idą partiami – nie zamykaj tej strony, dopóki licznik rośnie.
              </p>
            )}

            {finished && (
              <p className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle2 size={16} />
                Gotowe – uzupełniono {done}{" "}
                {done === 1 ? "zdjęcie" : done < 5 ? "zdjęcia" : "zdjęć"}.
              </p>
            )}

            {failed.length > 0 && (
              <div className="text-sm text-amber-800 space-y-2">
                <p className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Nie udało się przetworzyć {failed.length}{" "}
                  {failed.length === 1 ? "zdjęcia" : "zdjęć"}.
                </p>
                {/* Powód jest ważniejszy niż nazwa pliku – bez niego nie da się
                    rozpoznać, czy zawiódł magazyn, czy przetwarzanie zdjęcia.
                    Ten sam powód dla wszystkich pozycji pokazujemy raz */}
                {commonReason ? (
                  <p className="text-xs text-charcoal/80 pl-6">
                    Powód: <span className="text-espresso">{commonReason}</span>
                  </p>
                ) : (
                  <ul className="text-[11px] text-charcoal/80 pl-6 list-disc space-y-1">
                    {failed.slice(0, 5).map(({ name, reason }) => (
                      <li key={name} className="break-all">
                        {name} – <span className="text-espresso">{reason}</span>
                      </li>
                    ))}
                    {failed.length > 5 && <li>i {failed.length - 5} więcej</li>}
                  </ul>
                )}
                <p className="text-[11px] text-charcoal/80 pl-6">
                  Spróbuj jeszcze raz – przetwarzane są wyłącznie zdjęcia, którym czegoś brakuje.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={loadStatus}
              disabled={loading || running}
              className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-clay transition-colors hover:text-espresso disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Sprawdź ponownie
            </button>
          </>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle size={16} />
            {error}
          </p>
        )}
      </div>

      <p className="text-[11px] text-charcoal/80 leading-relaxed">
        Uzupełnianie nie zmienia zdjęć, które już masz – dokłada obok nich mniejsze wersje.
        Można je uruchamiać wielokrotnie: przetwarzane są wyłącznie zdjęcia, którym czegoś brakuje.
      </p>
    </div>
  );
}
