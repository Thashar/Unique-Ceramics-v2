"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  SHIPPING_METHOD_LABEL,
  SHIPPING_METHOD_NAMES,
  normalizeMethods,
  type ShippingMethodName,
} from "@/lib/free-shipping";
import PromoWindowFields, {
  emptyWindow,
  parseWindow,
  windowFrom,
  type PromoWindowValue,
} from "@/components/admin/PromoWindowFields";

export type FreeShippingDraft = {
  name: string;
  active: boolean;
  minOrderValue: number;
  methods: string[];
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

export default function FreeShippingPromoForm({
  id,
  initial,
}: {
  /** Brak = nowa promocja (POST); podany = edycja (PUT + usuwanie). */
  id?: string;
  initial?: FreeShippingDraft;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? "Darmowa wysyłka",
    active: initial?.active ?? true,
    minOrderValue: initial?.minOrderValue?.toString() ?? "300",
  });
  const [methods, setMethods] = useState<ShippingMethodName[]>(
    initial ? normalizeMethods(initial.methods) : [...SHIPPING_METHOD_NAMES]
  );
  const [windowValue, setWindowValue] = useState<PromoWindowValue>(
    initial ? windowFrom(initial.startsAt, initial.endsAt) : emptyWindow()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleMethod(method: ShippingMethodName) {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  }

  const windowError = parseWindow(windowValue).error;
  const threshold = Number(form.minOrderValue);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (windowError) {
      setError(windowError);
      return;
    }
    if (methods.length === 0) {
      setError("Wybierz co najmniej jedną metodę wysyłki.");
      return;
    }
    setSaving(true);

    const { startsAt, endsAt } = parseWindow(windowValue);
    const res = await fetch(
      id ? `/api/admin/promocje/wysylka/${id}` : "/api/admin/promocje/wysylka",
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          active: form.active,
          minOrderValue: form.minOrderValue,
          methods,
          startsAt: startsAt ? startsAt.toISOString() : null,
          endsAt: endsAt ? endsAt.toISOString() : null,
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nie udało się zapisać promocji");
      setSaving(false);
      return;
    }

    router.push("/admin/promocje");
    router.refresh();
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm(`Usunąć promocję „${form.name}”? Złożone zamówienia zostają bez zmian.`)) return;
    setSaving(true);
    const res = await fetch(`/api/admin/promocje/wysylka/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nie udało się usunąć promocji");
      setSaving(false);
      return;
    }
    router.push("/admin/promocje");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="min-w-0">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Nazwa promocji *
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={100}
            className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
          />
          <p className="text-[11px] text-charcoal/80 mt-1">Widoczna tylko w panelu.</p>
        </div>
        <div className="min-w-0">
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Próg wartości koszyka (zł)
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.minOrderValue}
            onChange={(e) => set("minOrderValue", e.target.value)}
            className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
          />
          <p className="text-[11px] text-charcoal/80 mt-1">
            {Number.isFinite(threshold) && threshold === 0
              ? "0 = darmowa wysyłka niezależnie od kwoty."
              : "Liczony od kwoty po wszystkich rabatach."}
          </p>
        </div>
      </div>

      {/* Metody */}
      <div className="border border-sand/60 bg-warm-white p-4">
        <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">
          Których metod dotyczy
        </p>
        <div className="space-y-2">
          {SHIPPING_METHOD_NAMES.map((method) => (
            <label
              key={method}
              className="flex items-center gap-3 text-sm text-espresso cursor-pointer"
            >
              <input
                type="checkbox"
                checked={methods.includes(method)}
                onChange={() => toggleMethod(method)}
                className="accent-clay shrink-0"
              />
              {SHIPPING_METHOD_LABEL[method]}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-charcoal/80 mt-3">
          Odbiór osobisty jest bezpłatny zawsze – nie zależy od promocji.
        </p>
      </div>

      <PromoWindowFields value={windowValue} onChange={setWindowValue} noun="Promocja" />

      <div className="border border-sand/60 bg-warm-white p-4">
        <label className="flex items-start gap-3 text-sm text-espresso cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
            className="mt-0.5 accent-clay shrink-0"
          />
          <span>
            Promocja aktywna
            <span className="block text-xs text-charcoal/80 mt-1">
              Odznaczenie wyłącza ją od razu, niezależnie od dat.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta hover:text-espresso disabled:opacity-50 text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {id ? "Zapisz zmiany" : "Dodaj promocję"}
        </button>
        {id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 border border-sand text-red-700 hover:bg-red-50 disabled:opacity-50 text-xs tracking-widest uppercase px-4 py-3 transition-colors"
          >
            <Trash2 size={14} strokeWidth={1.5} />
            Usuń promocję
          </button>
        )}
      </div>
    </form>
  );
}
