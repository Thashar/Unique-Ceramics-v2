"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";

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

export default function InPostWidget({ token, value, onChange }: Props) {
  const widgetRef = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;

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
  }, [token]);

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

  if (!token) {
    return (
      <div className="space-y-3">
        <div className="bg-cream border border-sand p-4 text-sm text-charcoal/60 flex items-start gap-3">
          <MapPin size={16} className="text-clay shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p>Wpisz kod paczkomatu lub znajdź go na stronie InPost.</p>
            <a
              href="https://inpost.pl/znajdz-paczkomat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-clay hover:text-espresso transition-colors text-xs mt-1"
            >
              Znajdź paczkomat <ExternalLink size={11} />
            </a>
          </div>
        </div>
        <input
          type="text"
          placeholder="np. WAR010"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono uppercase"
        />
      </div>
    );
  }

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
