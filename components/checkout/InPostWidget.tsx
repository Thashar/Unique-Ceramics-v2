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

// --- Pomocnicze ---

// Normalizuje tekst do porównywania: małe litery, bez polskich znaków diakrytycznych
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Filtruje listę punktów po zapytaniu we WSZYSTKICH polach (kod, ulica, miasto, kod pocztowy)
function filterByQuery(items: Point[], q: string): Point[] {
  const n = norm(q);
  return items.filter((p) =>
    norm(`${p.name} ${p.address.line1} ${p.address.line2}`).includes(n),
  );
}

// Buduje URL do API InPost:
// - litery + cyfry (WAR010, GLI11Z) → bezpośredni endpoint /points/{code}
// - cyfry z opcjonalnym myślnikiem (44, 44-, 44-100, 113, 44113) → zip_code
// - wszystko inne (miasto, ulica, fragment kodu) → city
function buildApiUrl(q: string): { url: string; direct: boolean } {
  const t = q.trim();
  if (/^[A-Za-z]{2,5}\d{1,5}[A-Za-z]?$/.test(t)) {
    return { url: `${API}/${t.toUpperCase()}`, direct: true };
  }
  if (/^\d{2,5}(-\d{0,3})?$/.test(t)) {
    return {
      url: `${API}?per_page=100&type=parcel_locker&zip_code=${encodeURIComponent(t)}`,
      direct: false,
    };
  }
  return {
    url: `${API}?per_page=100&type=parcel_locker&city=${encodeURIComponent(t)}`,
    direct: false,
  };
}

// --- Wyszukiwarka (bez tokenu) ---

function InPostSearch({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  // Akumulowany cache — zbiera wyniki ze WSZYSTKICH dotychczasowych zapytań API.
  // Dzięki temu po wyszukaniu "Gliwice" filtrowanie po "gli", "Poe", "113", "i11" itp.
  // działa natychmiast bez kolejnych requestów sieciowych.
  const cacheRef = useRef<{ fetchedUrls: Set<string>; items: Point[] }>({
    fetchedUrls: new Set(),
    items: [],
  });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const t = q.trim();
    if (t.length < 3) {
      setResults([]);
      setFetchError("");
      return;
    }

    // 1. Natychmiastowy wynik z akumulowanego cache — filtr po WSZYSTKICH polach
    //    (kod, ulica, miasto, kod pocztowy, każdy podciąg).
    const fromCache = filterByQuery(cacheRef.current.items, t);
    if (fromCache.length > 0) {
      setResults(fromCache);
      setLoading(false);
    }

    // 2. Wyznacz URL do API
    const { url, direct } = buildApiUrl(t);

    // Jeśli ten URL był już fetchowany — nie ma potrzeby odpytywać API ponownie.
    // Wyniki z cache (krok 1) są aktualne.
    if (cacheRef.current.fetchedUrls.has(url)) return;

    // 3. Anuluj poprzedni request w locie
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Spinner tylko gdy nie mamy nic do pokazania z cache
    if (fromCache.length === 0) setLoading(true);
    setFetchError("");

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("http");

      let items: Point[];
      if (direct) {
        const item = (await res.json()) as Point;
        items = item?.name ? [item] : [];
      } else {
        const data = await res.json();
        items = (data.items ?? []) as Point[];
      }

      // Oznacz URL jako pobrany (nawet gdy zwrócił 0 wyników — nie próbujemy ponownie)
      cacheRef.current.fetchedUrls.add(url);

      // 4. Scalaj nowe wyniki z cache (deduplikacja po nazwie kodu)
      if (items.length > 0) {
        const existing = new Set(cacheRef.current.items.map((i: Point) => i.name));
        const fresh = items.filter((i: Point) => !existing.has(i.name));
        cacheRef.current.items = [...cacheRef.current.items, ...fresh];
      }

      // 5. Filtruj pełen (scalony) cache po aktualnym zapytaniu
      const filtered = filterByQuery(cacheRef.current.items, t);
      setResults(filtered);

      if (filtered.length === 0 && fromCache.length === 0) {
        setFetchError("Brak wyników — sprawdź pisownię lub spróbuj kodu pocztowego (np. 44-100).");
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === "AbortError") return;
      // Jeśli mamy wyniki z cache — nie nadpisuj błędem, tylko zgaś spinner
      if (fromCache.length === 0) {
        setFetchError("Nie udało się pobrać listy paczkomatów. Sprawdź połączenie.");
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce 150 ms — krótki bo cache sprawdzany natychmiast
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(query), 150);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSearch]);

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
        Szukaj po mieście, kodzie pocztowym lub kodzie paczkomatu — po wyszukaniu miasta możesz zawęzić wyniki wpisując ulicę, kod lub fragment nazwy
      </label>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 pointer-events-none" />
        <input
          type="text"
          placeholder="np. Gliwice / 44-100 / GLI11Z"
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
