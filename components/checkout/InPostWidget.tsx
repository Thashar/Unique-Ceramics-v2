"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Loader2, Check, X } from "lucide-react";

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

function InPostSearch({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
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
      const res = await fetch(
        `https://api-shipx-pl.easypack24.net/v1/points?per_page=50&type=parcel_locker&city=${encodeURIComponent(trimmed)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults((data.items ?? []) as Point[]);
    } catch {
      setFetchError("Nie udało się pobrać listy. Sprawdź nazwę miasta lub wpisz kod paczkomatu ręcznie.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  function select(name: string) {
    onChange(name);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-4">
      {/* Wybrany paczkomat */}
      {value && (
        <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Check size={14} className="text-green-600 shrink-0" />
            <span className="text-green-800">
              Wybrany paczkomat: <strong className="font-mono">{value}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-green-600 hover:text-green-800 shrink-0"
            aria-label="Usuń wybór"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Wyszukiwarka po mieście */}
      <div>
        <label className="block text-xs text-charcoal/60 mb-2">Wyszukaj paczkomat po nazwie miasta</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 pointer-events-none" />
          <input
            type="text"
            placeholder="np. Warszawa, Kraków, Gliwice…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-cream border border-sand focus:border-clay outline-none pl-9 pr-10 py-3 text-espresso text-sm"
          />
          {loading && (
            <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-clay animate-spin" />
          )}
          {!loading && query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {fetchError && <p className="mt-1.5 text-xs text-red-600">{fetchError}</p>}

        {query.length >= 3 && !loading && results.length === 0 && !fetchError && (
          <p className="mt-1.5 text-xs text-charcoal/50">Brak wyników dla „{query}". Sprawdź pisownię lub wpisz kod ręcznie.</p>
        )}

        {results.length > 0 && (
          <div className="mt-1 border border-sand max-h-60 overflow-y-auto divide-y divide-sand">
            {results.map((point) => (
              <button
                key={point.name}
                type="button"
                onClick={() => select(point.name)}
                className={`w-full text-left px-4 py-2.5 hover:bg-mist transition-colors ${
                  value === point.name ? "bg-cream" : "bg-warm-white"
                }`}
              >
                <span className="font-mono text-xs font-semibold text-clay">{point.name}</span>
                <span className="block text-xs text-charcoal/60 mt-0.5 truncate">
                  {point.address.line1}, {point.address.line2}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-sand" />
        <span className="text-xs text-charcoal/40">lub wpisz kod bezpośrednio</span>
        <div className="flex-1 h-px bg-sand" />
      </div>

      {/* Pole ręczne */}
      <div>
        <input
          type="text"
          placeholder="np. WAR010"
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase()); setResults([]); }}
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono uppercase tracking-widest"
        />
        <p className="mt-1.5 text-xs text-charcoal/40">
          Kod znajdziesz na naklejce paczkomatu lub w{" "}
          <a
            href="https://inpost.pl/znajdz-paczkomat"
            target="_blank"
            rel="noopener noreferrer"
            className="text-clay hover:text-espresso underline underline-offset-2"
          >
            wyszukiwarce InPost
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function InPostWidget({ token, value, onChange }: Props) {
  if (token) {
    return <InPostMapWidget token={token} value={value} onChange={onChange} />;
  }
  return <InPostSearch value={value} onChange={onChange} />;
}
