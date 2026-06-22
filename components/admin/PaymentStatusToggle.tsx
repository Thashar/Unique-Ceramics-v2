"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const STATUSES = [
  { value: "PENDING", label: "Oczekuje", color: "bg-amber-50 text-amber-700 border-amber-300" },
  { value: "PAID",    label: "Opłacone", color: "bg-green-50 text-green-700 border-green-300" },
];

export default function PaymentStatusToggle({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const current = STATUSES.find((s) => s.value === status);

  async function handleChange(newStatus: string) {
    const targetLabel = STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
    const currentLabel = STATUSES.find((s) => s.value === status)?.label ?? status;
    if (!window.confirm(`Zmienić status płatności z „${currentLabel}" na „${targetLabel}"?`)) return;

    setSaving(true);
    setStatus(newStatus);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: newStatus }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {saving && <Loader2 size={12} className="text-charcoal/40 animate-spin" />}
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className={`appearance-none border px-2 py-0.5 text-xs font-medium rounded-sm outline-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-wait ${
          current?.color ?? "bg-sand text-charcoal border-sand"
        }`}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
