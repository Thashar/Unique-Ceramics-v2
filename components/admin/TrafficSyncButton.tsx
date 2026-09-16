"use client";

// Przycisk „Pobierz brakujące dni" w /admin/ruch. Jedno wywołanie
// `/api/admin/traffic/sync` obsługuje kilka dni (limit czasu funkcji), więc
// wołamy je w pętli, dopóki serwer zgłasza `remaining > 0` – po pierwszym
// uruchomieniu dociąga to całe 30-dniowe okno. Na koniec `router.refresh()`,
// bo historia wyżej na stronie liczona jest serwerowo.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

type Report = {
  skipped: "unconfigured" | "no-table" | null;
  results: { day: string; ok: boolean; error?: string }[];
  remaining: number;
};

/** Bezpiecznik – gdyby API stale odmawiało, pętla nie może kręcić się w nieskończoność. */
const MAX_ROUNDS = 12;

interface Props {
  /** Ile dni z okna brakuje w bazie – do etykiety przycisku. */
  missing: number;
}

export default function TrafficSyncButton({ missing }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setProgress("Łączenie z Vercelem…");
    let synced = 0;
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await fetch("/api/admin/traffic/sync", { method: "POST" });
        if (!res.ok) {
          setError("Synchronizacja nie powiodła się. Szczegóły w logach serwera.");
          break;
        }
        const report = (await res.json()) as Report;
        if (report.skipped === "unconfigured") {
          setError("Brak konfiguracji – ustaw VERCEL_ANALYTICS_TOKEN i VERCEL_ANALYTICS_PROJECT_ID.");
          break;
        }
        if (report.skipped === "no-table") {
          setError("Brak tabeli TrafficStat – uruchom migrację manual_add_traffic_stats.sql.");
          break;
        }
        const okDays = report.results.filter((r) => r.ok);
        const failed = report.results.find((r) => !r.ok);
        synced += okDays.length;
        setProgress(`Zapisano ${synced} ${synced === 1 ? "dzień" : "dni"}, brakuje jeszcze ${report.remaining}…`);
        if (failed) {
          setError(`Dzień ${failed.day}: ${failed.error ?? "błąd"}`);
          break;
        }
        if (report.remaining === 0 || okDays.length === 0) break;
      }
    } catch {
      setError("Nie udało się połączyć z serwerem.");
    } finally {
      setProgress(synced > 0 ? `Zapisano ${synced} ${synced === 1 ? "dzień" : "dni"}.` : null);
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 border border-clay text-clay px-4 py-2 text-xs tracking-widest uppercase hover:bg-clay hover:text-warm-white transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {missing > 0 ? `Pobierz brakujące dni (${missing})` : "Odśwież ostatnie dni"}
      </button>
      {progress && <p className="text-xs text-charcoal/80">{progress}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
