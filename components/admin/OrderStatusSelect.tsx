"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

const STATUSES = [
  { value: "PENDING",     label: "Nowe",         color: "bg-amber-50 text-amber-800 border-amber-300" },
  { value: "CONFIRMED",   label: "Potwierdzone", color: "bg-blue-50 text-blue-800 border-blue-300" },
  { value: "IN_PROGRESS", label: "W realizacji", color: "bg-orange-50 text-orange-800 border-orange-300" },
  { value: "SHIPPED",     label: "Wysłane",      color: "bg-purple-50 text-purple-800 border-purple-300" },
  { value: "DELIVERED",   label: "Dostarczone",  color: "bg-green-50 text-green-800 border-green-300" },
  { value: "CANCELLED",   label: "Anulowane",    color: "bg-red-50 text-red-700 border-red-300" },
];

const SHIPPED_OR_LATER = ["SHIPPED", "DELIVERED"];

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

  const current = STATUSES.find((s) => s.value === status);

  const requiresTracking = shippingMethod !== "pickup";

  async function handleChange(newStatus: string) {
    if (SHIPPED_OR_LATER.includes(newStatus) && requiresTracking && !hasTracking) {
      setTrackingError(true);
      return;
    }
    setTrackingError(false);

    const targetLabel = STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
    const currentLabel = STATUSES.find((s) => s.value === status)?.label ?? status;
    if (!window.confirm(`Zmienić status z „${currentLabel}" na „${targetLabel}"?`)) return;

    setSaving(true);
    setStatus(newStatus);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    if (!res.ok) {
      setStatus(currentStatus);
    }
    router.refresh();
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
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
        </div>
      </div>
      {trackingError && (
        <p className="text-xs text-red-600 text-right max-w-48">
          Uzupełnij numer listu i dostawcę przed zmianą na „Wysłane".
        </p>
      )}
    </div>
  );
}
