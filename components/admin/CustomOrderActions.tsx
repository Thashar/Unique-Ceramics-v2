"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "NEW", label: "Nowe" },
  { value: "IN_REVIEW", label: "W trakcie" },
  { value: "DONE", label: "Zrealizowane" },
  { value: "CANCELLED", label: "Anulowane" },
];

export default function CustomOrderActions({
  orderId,
  currentStatus,
  currentNotes,
}: {
  orderId: string;
  currentStatus: string;
  currentNotes: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/custom-orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes: notes }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setSaved(false);
  }

  return (
    <div className="bg-cream p-6 space-y-4">
      <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Status i notatki</h2>

      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Status</label>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-2.5 text-sm text-espresso"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Notatki admina</label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          placeholder="Notatki wewnętrzne..."
          className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase px-6 py-2.5 transition-colors disabled:opacity-60"
        >
          {saving ? "Zapisuję..." : "Zapisz"}
        </button>
        {saved && <span className="text-xs text-green-600">Zapisano</span>}
      </div>
    </div>
  );
}
