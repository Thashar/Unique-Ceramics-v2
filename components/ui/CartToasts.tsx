"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, X } from "lucide-react";
import { dismissCartNotice, useCartNotices, type CartNotice } from "@/lib/cart";

/** Ile czasu komunikat wisi, zanim sam zniknie. */
const AUTO_DISMISS_MS = 9000;

/**
 * Czy jesteśmy już w przeglądarce – portal potrzebuje `document`.
 * Przez `useSyncExternalStore`, nie `setState` w efekcie (reguła
 * `react-hooks/set-state-in-effect`, patrz CLAUDE.md).
 */
const noop = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}

/**
 * Dymki z komunikatami koszyka – wyprzedany produkt, zmniejszona ilość.
 *
 * Renderowane z layoutu, więc klient zobaczy je **niezależnie od tego, na której
 * stronie akurat jest**: koszyk potrafi zmienić się w tle (ktoś inny kupił
 * ostatnią sztukę), a taka zmiana nie może przejść bez słowa.
 *
 * Przez portal do `body`, bo `position: fixed` liczy się względem najbliższego
 * przodka z `transform`/`filter` – wewnątrz animowanych sekcji strony dymek
 * lądowałby w losowym miejscu (ten sam powód co przy `Toast` w panelu).
 */
export default function CartToasts() {
  const notices = useCartNotices();
  const mounted = useMounted();

  if (!mounted || notices.length === 0) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[60] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm"
    >
      {notices.map((notice) => (
        <ToastItem key={notice.id} notice={notice} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ notice }: { notice: CartNotice }) {
  useEffect(() => {
    const timer = setTimeout(() => dismissCartNotice(notice.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notice.id]);

  const warning = notice.kind === "warning";
  const Icon = warning ? AlertTriangle : Info;

  return (
    <div
      className={`flex items-start gap-3 border px-4 py-3 shadow-lg ${
        warning
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : "bg-cream border-sand text-espresso"
      }`}
    >
      <Icon size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 text-sm leading-relaxed">{notice.text}</p>
      <button
        type="button"
        onClick={() => dismissCartNotice(notice.id)}
        aria-label="Zamknij powiadomienie"
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}
