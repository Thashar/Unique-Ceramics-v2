"use client";

import { dateToWarsawLocal, formatWarsaw, warsawLocalToDate } from "@/lib/warsaw-time";
import { windowState } from "@/lib/product-price";

const HOUR_MS = 3_600_000;

/** Gotowe czasy trwania – te same, co przy rabacie w karcie produktu i kodach. */
const DURATIONS: { value: string; label: string }[] = [
  { value: "", label: "Bezterminowo" },
  { value: "24", label: "24 godziny" },
  { value: "48", label: "2 dni" },
  { value: "72", label: "3 dni" },
  { value: "168", label: "7 dni" },
  { value: "336", label: "14 dni" },
  { value: "720", label: "30 dni" },
  { value: "custom", label: "Do wskazanej daty" },
];

export type PromoWindowValue = {
  /** Wartości w formacie `<input type="datetime-local">`, czyli w czasie polskim. */
  startsAt: string;
  endsAt: string;
  durationPreset: string;
};

/** Pusty stan okna – dla nowej promocji. */
export function emptyWindow(endsAt?: Date | string | null): PromoWindowValue {
  return {
    startsAt: "",
    endsAt: dateToWarsawLocal(endsAt),
    durationPreset: endsAt ? "custom" : "",
  };
}

/** Okno z istniejącego rekordu. */
export function windowFrom(
  startsAt?: Date | string | null,
  endsAt?: Date | string | null
): PromoWindowValue {
  return {
    startsAt: dateToWarsawLocal(startsAt),
    endsAt: dateToWarsawLocal(endsAt),
    durationPreset: endsAt ? "custom" : "",
  };
}

/** Daty w UTC gotowe do wysłania na serwer + komunikat błędu. */
export function parseWindow(value: PromoWindowValue): {
  startsAt: Date | null;
  endsAt: Date | null;
  error: string;
} {
  const startsAt = value.startsAt ? warsawLocalToDate(value.startsAt) : null;
  const endsAt = value.endsAt ? warsawLocalToDate(value.endsAt) : null;
  const error =
    (value.startsAt && !startsAt) || (value.endsAt && !endsAt)
      ? "Nieprawidłowa data."
      : startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()
        ? "Koniec musi być późniejszy niż początek."
        : "";
  return { startsAt, endsAt, error };
}

/**
 * Okno obowiązywania promocji – wspólne dla rabatu ilościowego i darmowej
 * wysyłki (kody rabatowe mają własną, starszą kopię tego układu).
 *
 * Daty wpisuje się w **czasie polskim**; na UTC przelicza je `parseWindow`
 * dopiero przy zapisie – patrz `lib/warsaw-time.ts`.
 */
export default function PromoWindowFields({
  value,
  onChange,
  noun,
}: {
  value: PromoWindowValue;
  onChange: (next: PromoWindowValue) => void;
  /** Rzeczownik do podsumowania, np. „Promocja”. */
  noun: string;
}) {
  const { startsAt, endsAt, error } = parseWindow(value);

  function endAfterHours(hours: number, startLocal: string): string {
    const from = warsawLocalToDate(startLocal) ?? new Date();
    return dateToWarsawLocal(new Date(from.getTime() + hours * HOUR_MS));
  }

  function setStart(next: string) {
    const shouldRecalc = value.durationPreset && value.durationPreset !== "custom";
    onChange({
      ...value,
      startsAt: next,
      endsAt: shouldRecalc ? endAfterHours(Number(value.durationPreset), next) : value.endsAt,
    });
  }

  function setDuration(preset: string) {
    if (preset === "") {
      onChange({ ...value, durationPreset: preset, endsAt: "" });
      return;
    }
    if (preset === "custom") {
      onChange({
        ...value,
        durationPreset: preset,
        endsAt: value.endsAt || endAfterHours(168, value.startsAt),
      });
      return;
    }
    onChange({
      ...value,
      durationPreset: preset,
      endsAt: endAfterHours(Number(preset), value.startsAt),
    });
  }

  const summary = (() => {
    if (error) return "";
    // Stan liczy `windowState` – bieżący czas bierze wewnątrz siebie, żeby nie
    // wołać `Date.now()` w renderze (reguła `react-hooks/purity`)
    const state = windowState(startsAt, endsAt);
    if (state === "expired") return `${noun} zakończyła się ${formatWarsaw(endsAt)}.`;
    if (state === "scheduled") {
      return endsAt
        ? `${noun} zadziała od ${formatWarsaw(startsAt)} do ${formatWarsaw(endsAt)}.`
        : `${noun} zadziała od ${formatWarsaw(startsAt)}, bezterminowo.`;
    }
    return endsAt
      ? `${noun} działa do ${formatWarsaw(endsAt)}.`
      : `${noun} działa bezterminowo – do chwili wyłączenia jej tutaj.`;
  })();

  return (
    <div className="border border-sand/60 bg-warm-white p-4">
      <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">
        Czas obowiązywania <span className="text-clay">(czas polski)</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="min-w-0">
          <label className="block text-[11px] text-charcoal/80 mb-1.5">Start</label>
          <input
            type="datetime-local"
            value={value.startsAt}
            onChange={(e) => setStart(e.target.value)}
            className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
          />
          <p className="text-[11px] text-charcoal/80 mt-1">Puste = od zapisania.</p>
        </div>
        <div className="min-w-0">
          <label className="block text-[11px] text-charcoal/80 mb-1.5">Czas trwania</label>
          <select
            value={value.durationPreset}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d.value || "none"} value={d.value}>{d.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-charcoal/80 mt-1">Wypełnia pole „Do kiedy”.</p>
        </div>
        <div className="min-w-0">
          <label className="block text-[11px] text-charcoal/80 mb-1.5">Do kiedy</label>
          <input
            type="datetime-local"
            value={value.endsAt}
            onChange={(e) =>
              onChange({
                ...value,
                endsAt: e.target.value,
                durationPreset: e.target.value ? "custom" : "",
              })
            }
            className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
          />
          <p className="text-[11px] text-charcoal/80 mt-1">Puste = bezterminowo.</p>
        </div>
      </div>
      {error ? (
        <p className="text-xs text-red-700 mt-3">{error}</p>
      ) : (
        <p className="text-xs text-espresso mt-3">{summary}</p>
      )}
    </div>
  );
}
