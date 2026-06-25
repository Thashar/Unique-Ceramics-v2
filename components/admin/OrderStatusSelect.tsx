"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

const STATUSES = [
  { value: "PENDING",     label: "Nowe",         color: "bg-amber-50 text-amber-800 border-amber-300" },
  { value: "CONFIRMED",   label: "Potwierdzone", color: "bg-blue-50 text-blue-800 border-blue-300" },
  { value: "PAID",        label: "Opłacone",     color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  { value: "IN_PROGRESS", label: "W realizacji", color: "bg-orange-50 text-orange-800 border-orange-300" },
  { value: "SHIPPED",     label: "Wysłane",      color: "bg-purple-50 text-purple-800 border-purple-300" },
  { value: "DELIVERED",   label: "Dostarczone",  color: "bg-green-50 text-green-800 border-green-300" },
  { value: "CANCELLED",   label: "Anulowane",    color: "bg-red-50 text-red-700 border-red-300" },
];

// Liniowy przepływ statusów — każdy można przesunąć tylko o 1 do przodu.
const FLOW = ["PENDING", "CONFIRMED", "PAID", "IN_PROGRESS", "SHIPPED", "DELIVERED"];

const SHIPPED_OR_LATER = ["SHIPPED", "DELIVERED"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Date → wartość pola <input type="datetime-local"> (czas lokalny)
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Czy przejście z `from` na `to` jest dozwolone:
// - ten sam status (no-op),
// - dokładnie 1 krok do przodu w FLOW,
// - anulowanie z dowolnego statusu (poza już anulowanym).
function isAllowedTransition(from: string, to: string): boolean {
  if (to === from) return true;
  if (to === "CANCELLED") return from !== "CANCELLED";
  const i = FLOW.indexOf(from);
  return i !== -1 && FLOW[i + 1] === to;
}

export default function OrderStatusSelect({
  orderId,
  currentStatus,
  shippingMethod,
  hasTracking,
}: {
  orderId: string;
  currentStatus: string;
  shippingMethod?: string;
  hasTracking?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [trackingError, setTrackingError] = useState(false);

  // Modal daty wpłaty (przy przejściu na „Opłacone")
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [paidValue, setPaidValue]         = useState("");
  const [paidError, setPaidError]         = useState("");

  const current = STATUSES.find((s) => s.value === status);

  const requiresTracking = shippingMethod !== "pickup";

  async function patchStatus(newStatus: string, paidAtIso?: string): Promise<boolean> {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paidAtIso ? { status: newStatus, paidAt: paidAtIso } : { status: newStatus }),
    });
    setSaving(false);
    return res.ok;
  }

  async function handleChange(newStatus: string) {
    if (!isAllowedTransition(status, newStatus)) return;

    // Przejście na „Opłacone" → modal z datą i godziną wpłaty
    if (newStatus === "PAID") {
      setPaidValue(toLocalInput(new Date()));
      setPaidError("");
      setPaidModalOpen(true);
      return;
    }

    if (SHIPPED_OR_LATER.includes(newStatus) && requiresTracking && !hasTracking) {
      setTrackingError(true);
      return;
    }
    setTrackingError(false);

    const targetLabel = STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
    const currentLabel = STATUSES.find((s) => s.value === status)?.label ?? status;
    if (!window.confirm(`Zmienić status z „${currentLabel}" na „${targetLabel}"?`)) return;

    setStatus(newStatus);
    const ok = await patchStatus(newStatus);
    if (!ok) setStatus(currentStatus);
    router.refresh();
  }

  async function confirmPaid() {
    const d = new Date(paidValue);
    if (isNaN(d.getTime())) {
      setPaidError("Podaj poprawną datę i godzinę.");
      return;
    }
    const ok = await patchStatus("PAID", d.toISOString());
    if (ok) {
      setStatus("PAID");
      setPaidModalOpen(false);
      router.refresh();
    } else {
      setPaidError("Nie udało się zapisać. Sprawdź datę (nie z przyszłości, nie przed złożeniem zamówienia).");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2.5">
        {saving && <Loader2 size={14} className="text-charcoal/40 animate-spin" />}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className={`appearance-none border pl-3 pr-8 py-2 text-xs font-medium tracking-wide rounded-sm outline-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-wait ${
              current?.color ?? "bg-sand text-charcoal border-sand"
            }`}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value} disabled={!isAllowedTransition(status, s.value)}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
        </div>
      </div>
      {trackingError && (
        <p className="text-xs text-red-600 text-right max-w-48">
          Uzupelnij numer listu i dostawce przed zmiana na Wyslane.
        </p>
      )}

      {/* Modal daty wpłaty */}
      {paidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 px-4">
          <div className="bg-warm-white border border-sand rounded-sm shadow-xl w-full max-w-sm p-6 text-left">
            <h3 className="font-serif text-lg text-espresso mb-1">Data wpłaty</h3>
            <p className="text-xs text-charcoal/55 mb-4">
              Podaj datę i godzinę otrzymania wpłaty. Przychód zostanie rozliczony w miesiącu tej daty.
            </p>
            <input
              type="datetime-local"
              value={paidValue}
              onChange={(e) => setPaidValue(e.target.value)}
              disabled={saving}
              className="w-full border border-clay bg-warm-white text-espresso text-sm px-3 py-2 rounded-sm outline-none disabled:opacity-60"
            />
            {paidError && <p className="text-xs text-red-600 mt-2">{paidError}</p>}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setPaidModalOpen(false)}
                disabled={saving}
                className="text-xs text-charcoal/50 hover:text-charcoal px-3 py-2 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={confirmPaid}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs bg-clay text-warm-white px-4 py-2 rounded-sm hover:bg-espresso transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? "Zapis…" : "Oznacz jako opłacone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
