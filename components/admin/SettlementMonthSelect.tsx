"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

// Liczba miesięcy wstecz, na które można cofnąć rozliczenie
const MAX_BACK = 3;

export default function SettlementMonthSelect({
  orderId,
  paidAt,
  createdAt,
  settlementDate,
}: {
  orderId: string;
  paidAt: string | null;
  createdAt: string;
  settlementDate: string | null;
}) {
  const router = useRouter();

  // Miesiąc bazowy = miesiąc wpłaty (lub utworzenia, gdy brak paidAt)
  const base       = new Date(paidAt ?? createdAt);
  const baseYear   = base.getFullYear();
  const baseMonth  = base.getMonth();

  // Aktualnie wybrany miesiąc (z nadpisania lub bazowy)
  const initial = settlementDate ? new Date(settlementDate) : base;
  const initialValue = `${initial.getFullYear()}-${initial.getMonth()}`;

  const [value, setValue]   = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Opcje: miesiąc bazowy oraz do 3 wcześniejszych
  const options = Array.from({ length: MAX_BACK + 1 }, (_, k) => {
    const d = new Date(baseYear, baseMonth - k, 1);
    return {
      value: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MONTHS_PL[d.getMonth()]} ${d.getFullYear()}`,
    };
  });

  async function handleChange(next: string) {
    const prev = value;
    setValue(next);
    setSaving(true);
    setSaved(false);

    const [y, m] = next.split("-").map(Number);
    // Wybór miesiąca bazowego = brak nadpisania (null)
    const isBase = y === baseYear && m === baseMonth;
    const settlement = isBase ? null : new Date(y, m, 15, 12, 0, 0).toISOString();

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementDate: settlement }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setValue(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className="block text-xs text-charcoal/55 mb-1">Miesiąc rozliczenia (przychód wg daty wpłaty)</label>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="appearance-none border border-sand bg-warm-white text-espresso text-xs px-2.5 py-1 rounded-sm outline-none cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {saving && <Loader2 size={12} className="text-charcoal/40 animate-spin" />}
        {saved && !saving && <Check size={12} className="text-green-600" />}
      </div>
      {settlementDate && (
        <p className="text-[11px] text-terracotta mt-1">Rozliczenie przesunięte z miesiąca wpłaty.</p>
      )}
    </div>
  );
}
