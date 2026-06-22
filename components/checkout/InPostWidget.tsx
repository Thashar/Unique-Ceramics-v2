"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Loader2, Check, X, RefreshCw } from "lucide-react";

const API = "https://api-shipx-pl.easypack24.net/v1/points";

interface Point {
  name: string;
  address: { line1: string; line2: string };
}

interface Props {
  token: string | null;
  value: string;
  onChange: (code: string) => void;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "inpost-geowidget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          token?: string;
          language?: string;
          config?: string;
          onpoint?: string;
        },
        HTMLElement
      >;
    }
  }
}

// --- Mapa-widget (gdy token jest dostępny) ---

function InPostMapWidget({ token, value, onChange }: Props & { token: string }) {
  const widgetRef = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://geowidget.inpost.pl/inpost-geowidget.js";
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://geowidget.inpost.pl/inpost-geowidget.css";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (!loaded || !widgetRef.current) return;
    const el = widgetRef.current;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.name) onChange(detail.name);
    };
    el.addEventListener("onpoint", handler);
    return () => el.removeEventListener("onpoint", handler);
  }, [loaded, onChange]);

  return (
    <div className="space-y-3">
      {value && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 text-sm">
          <MapPin size={14} className="text-green-600 shrink-0" />
          <span className="text-green-800">Wybrany paczkomat: <strong className="font-mono">{value}</strong></span>
        </div>
      )}
      {loaded ? (
        /* @ts-expect-error -- custom element */
        <inpost-geowidget
          ref={widgetRef}
          token={token}
          language="pl"
          config="parcelcollect"
          style={{ width: "100%", display: "block" }}
        />
      ) : (
        <div className="h-64 bg-cream border border-sand flex items-center justify-center text-sm text-charcoal/40">
          Ładowanie mapy paczkomatów…
        </div>
      )}
    </div>
  );
}

// --- Wykrywanie trybu wyszukiwania ---

type SearchMode = "zip_code" | "name" | "city";

function detectMode(q: string): SearchMode {
  const t = q.trim();
  // Kod pocztowy: XX-XXX
  if (/^\d{2}-\d{3}$/.test(t)) return "zip_code";
  // Kod paczkomatu: 3–8 znaków złożonych WYŁĄCZNIE z liter A-Z i cyfr (bez polskich znaków, bez spacji)
  if (/^[A-Z0-9]{3,8}$/i.test(t) && /[A-Z]/i.test(t)) return "name";
  return "city";
}

async function fetchPoints(q: string, mode: SearchMode): Promise<Point[]> {
  const t = q.trim();

  if (mode === "name") {
    // Próba pobrania pojedynczego paczkomatu po kodzie
    const res = await fetch(`${API}/${encodeURIComponent(t.toUpperCase())}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const item = await res.json() as Point;
      return item?.name ? [item] : [];
    }
    // Jeśli nie znaleziono — szukaj jako prefiks w mieście (fallback)
    return [];
  }

  const param = mode === "zip_code" ? `zip_code=${encodeURIComponent(t)}` : `city=${encodeURIComponent(t)}`;
  const res = await fetch(`${API}?per_page=80&type=parcel_locker&${param}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return (data.items ?? []) as Point[];
}

// --- Wyszukiwarka (bez tokenu) ---

function InPostSearch({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setFetchError("");
      return;
    }
    setLoading(true);
    setFetchError("");
    try {
      const mode = detectMode(trimmed);
      const items = await fetchPoints(trimmed, mode);
      setResults(items);
      if (items.length === 0 && mode === "city") {
        setFetchError("Brak wyników. Spróbuj innej nazwy miasta lub wpisz kod pocztowy (np. 44-100).");
      }
    } catch {
      setFetchError("Nie udało się pobrać listy paczkomatów. Sprawdź połączenie i spróbuj ponownie.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  function select(point: Point) {
    onChange(point.name);
    setSelectedPoint(point);
    setQuery("");
    setResults([]);
    setFetchError("");
  }

  function clear() {
    onChange("");
    setSelectedPoint(null);
  }

  // Wybrany paczkomat — pokaż szczegóły i opcję zmiany
  if (value) {
    return (
      <div className="bg-green-50 border border-green-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Check size={16} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800 font-mono">{value}</p>
              {selectedPoint && (
                <p className="text-xs text-green-700 mt-0.5">
                  {selectedPoint.address.line1}, {selectedPoint.address.line2}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-900 shrink-0 border border-green-300 hover:border-green-500 px-2.5 py-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            Zmień
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-charcoal/60 mb-1">
        Szukaj po nazwie miasta, kodzie pocztowym lub kodzie paczkomatu
      </label>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 pointer-events-none" />
        <input
          type="text"
          placeholder="np. Warszawa / 44-100 / WAR010"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          className="w-full bg-cream border border-sand focus:border-clay outline-none pl-9 pr-10 py-3 text-espresso text-sm"
        />
        {loading && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-clay animate-spin" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setFetchError(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {fetchError && <p className="text-xs text-amber-700">{fetchError}</p>}

      {results.length > 0 && (
        <div className="border border-sand max-h-64 overflow-y-auto divide-y divide-sand">
          {results.map((point) => (
            <button
              key={point.name}
              type="button"
              onClick={() => select(point)}
              className="w-full text-left px-4 py-2.5 hover:bg-mist bg-warm-white transition-colors"
            >
              <span className="font-mono text-xs font-semibold text-clay">{point.name}</span>
              <span className="block text-xs text-charcoal/60 mt-0.5">
                {point.address.line1}, {point.address.line2}
              </span>
            </button>
          ))}
        </div>
      )}

      {query.length >= 3 && !loading && results.length === 0 && !fetchError && (
        <p className="text-xs text-charcoal/40">Szukam…</p>
      )}
    </div>
  );
}

// --- Eksport ---

export default function InPostWidget({ token, value, onChange }: Props) {
  if (token) {
    return <InPostMapWidget token={token} value={value} onChange={onChange} />;
  }
  return <InPostSearch value={value} onChange={onChange} />;
}
