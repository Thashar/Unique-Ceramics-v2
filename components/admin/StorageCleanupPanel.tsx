"use client";

import { useState } from "react";
import { Loader2, Trash2, CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

/**
 * Sprzątanie **nieużywanych plików** w magazynie zdjęć (Ustawienia → Zdjęcia).
 *
 * Nic w panelu nie kasuje plików z magazynu, a upload jest natychmiastowy, więc
 * porzucone i podmienione zdjęcia zostają tam na zawsze (patrz „Osierocone pliki”
 * w CLAUDE.md). Ten panel pokazuje, których plików nie wskazuje **nic** w bazie,
 * i pozwala je usunąć.
 *
 * Operacja jest **nieodwracalna**, więc lista jest zawsze pokazywana przed
 * usunięciem, a serwer i tak weryfikuje każdą nazwę jeszcze raz. Zdjęcia wgrane
 * w ostatnich dniach są chronione karencją – zdjęcie w otwartym formularzu istnieje
 * w magazynie, zanim ktokolwiek kliknie „Zapisz”.
 */

type Unused = { name: string; size: number; createdAt: string | null; url: string };
type Scan = {
  total: number;
  used: number;
  unused: Unused[];
  tooFresh: number;
  freeableBytes: number;
  minAgeDays: number;
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} kB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pl-PL");
}

export default function StorageCleanupPanel() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState<{ count: number; bytes: number } | null>(null);
  const [error, setError] = useState("");
  /** Nazwa pliku, który właśnie jest kasowany – blokuje tylko jego kafelek. */
  const [busyName, setBusyName] = useState("");
  /** Pliki, których przeglądarka nie umiała wyświetlić – najczęściej uszkodzone. */
  const [broken, setBroken] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    setError("");
    setRemoved(null);
    try {
      const res = await fetch("/api/admin/storage-cleanup");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Nie udało się sprawdzić magazynu.");
      setScan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się sprawdzić magazynu.");
    } finally {
      setLoading(false);
    }
  }

  /** Wspólna droga dla obu przycisków – serwer i tak weryfikuje każdą nazwę. */
  async function deleteFiles(names: string[]): Promise<boolean> {
    setError("");
    try {
      const res = await fetch("/api/admin/storage-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Nie udało się usunąć plików.");
      setRemoved({ count: data.removed, bytes: data.freedBytes });
      // Kafelki znikają od razu, bez ponownego skanu – ten trwa (czyta całą bazę
      // i cały magazyn), a przy kasowaniu pojedynczych plików czekanie na niego
      // po każdym kliknięciu byłoby nie do zniesienia
      const gone = new Set(names);
      setScan((prev) =>
        prev
          ? {
              ...prev,
              total: prev.total - data.removed,
              unused: prev.unused.filter((f) => !gone.has(f.name)),
              freeableBytes: prev.unused
                .filter((f) => !gone.has(f.name))
                .reduce((sum, f) => sum + f.size, 0),
            }
          : prev
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się usunąć plików.");
      return false;
    }
  }

  async function removeOne(file: Unused) {
    if (!window.confirm(
      `Usunąć bezpowrotnie plik ${file.name}?\n\n` +
      "Nie wskazuje go żaden produkt, projekt ani ustawienie. Operacji nie da się cofnąć."
    )) return;
    setBusyName(file.name);
    await deleteFiles([file.name]);
    setBusyName("");
  }

  async function removeAll() {
    if (!scan?.unused.length) return;
    const count = scan.unused.length;
    if (!window.confirm(
      `Usunąć bezpowrotnie ${count} ${count === 1 ? "plik" : "plików"} z magazynu?\n\n` +
      "Tych plików nie wskazuje żaden produkt, projekt ani ustawienie. Operacji nie da się cofnąć."
    )) return;

    setRemoving(true);
    await deleteFiles(scan.unused.map((f) => f.name));
    setRemoving(false);
  }

  return (
    <div className="max-w-2xl space-y-6 border-t border-sand pt-8">
      <div>
        <h2 className="font-serif text-2xl text-espresso">Nieużywane pliki</h2>
        <p className="text-xs text-charcoal/80 leading-relaxed mt-2">
          Zdjęcie wgrane do formularza trafia do magazynu od razu, a usunięcie produktu albo
          kafelka zdjęcia zostawia plik na miejscu. Z czasem zbierają się pliki, których nie
          wskazuje już nic w sklepie. Tutaj można je znaleźć i usunąć.
        </p>
      </div>

      <div className="border border-sand p-4 space-y-4">
        {!scan && (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-clay text-clay text-xs tracking-widest uppercase transition-colors hover:bg-clay hover:text-warm-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sprawdź magazyn
          </button>
        )}

        {scan && (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-[11px] tracking-widest uppercase text-charcoal/80">Plików łącznie</dt>
                <dd className="text-espresso tabular-nums mt-1">{scan.total}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-widest uppercase text-charcoal/80">Używanych</dt>
                <dd className="text-espresso tabular-nums mt-1">{scan.used}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-widest uppercase text-charcoal/80">Do usunięcia</dt>
                <dd className="text-espresso tabular-nums mt-1">
                  {scan.unused.length}
                  {scan.unused.length > 0 && (
                    <span className="text-charcoal/80 text-xs"> ({formatSize(scan.freeableBytes)})</span>
                  )}
                </dd>
              </div>
            </dl>

            {scan.tooFresh > 0 && (
              <p className="flex items-start gap-2 text-xs text-charcoal/80">
                <ShieldCheck size={14} className="text-clay shrink-0 mt-0.5" />
                <span>
                  {scan.tooFresh} {scan.tooFresh === 1 ? "plik jest" : "plików jest"} chronionych –
                  wgrane w ostatnich {scan.minAgeDays} dniach. Zdjęcie w otwartym formularzu leży
                  już w magazynie, więc świeżych nie ruszamy.
                </span>
              </p>
            )}

            {scan.unused.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle2 size={16} />
                Nie ma czego sprzątać – każdy plik jest gdzieś używany.
              </p>
            ) : (
              <>
                {/* Podgląd jest obowiązkowy: operacji nie da się cofnąć, a właściciel
                    rozpozna zdjęcie po wyglądzie, nie po nazwie pliku. Kafelek, którego
                    przeglądarka nie umie wyświetlić, mówi o tym wprost – to zwykle plik
                    uszkodzony jeszcze przy wgrywaniu */}
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {scan.unused.map((f) => (
                    <li key={f.name} className="border border-sand">
                      <div className="relative aspect-[4/3] bg-cream flex items-center justify-center overflow-hidden">
                        {broken.has(f.name) ? (
                          <span className="px-2 text-center text-[10px] leading-tight text-charcoal/80">
                            Nie da się wyświetlić
                            <br />
                            (plik uszkodzony)
                          </span>
                        ) : (
                          // Zwykły <img>, nie next/image: loader podmieniłby adres na wariant,
                          // a tu chodzi o podgląd dokładnie tego pliku, który kasujemy
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={f.url}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-contain"
                            onError={() => setBroken((prev) => new Set(prev).add(f.name))}
                          />
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] text-charcoal/80 break-all leading-tight">{f.name}</p>
                        <p className="text-[10px] text-charcoal/80 tabular-nums">
                          {formatSize(f.size)}
                          {formatDate(f.createdAt) && ` · ${formatDate(f.createdAt)}`}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeOne(f)}
                          disabled={busyName === f.name || removing}
                          className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 border border-clay text-clay text-[10px] tracking-widest uppercase transition-colors hover:bg-clay hover:text-warm-white disabled:opacity-50"
                        >
                          {busyName === f.name ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Usuń
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={removeAll}
                  disabled={removing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-clay text-warm-white text-xs tracking-widest uppercase transition-colors hover:bg-terracotta hover:text-espresso disabled:opacity-50"
                >
                  {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Usuń wszystkie ({scan.unused.length})
                </button>
              </>
            )}

            {removed && (
              <p className="flex items-center gap-2 text-sm text-green-800">
                <CheckCircle2 size={16} />
                Usunięto {removed.count} {removed.count === 1 ? "plik" : "plików"}
                {removed.bytes > 0 && ` – zwolniono ${formatSize(removed.bytes)}`}.
              </p>
            )}

            <button
              type="button"
              onClick={load}
              disabled={loading || removing}
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
        Za używany uznajemy plik wskazany przez produkt, projekt albo ustawienie – razem
        z jego mniejszymi wersjami. Skan czyta też treści opisów, bo zdjęcie może być
        wstawione w środek tekstu. Usunięcia nie da się cofnąć.
      </p>
    </div>
  );
}
