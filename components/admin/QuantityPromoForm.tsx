"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { MAX_DISCOUNT_PERCENT } from "@/lib/product-price";
import {
  MAX_TIERS,
  applyQuantityDiscount,
  normalizeTiers,
  type QuantityTier,
} from "@/lib/quantity-promo";
import PromoWindowFields, {
  emptyWindow,
  parseWindow,
  windowFrom,
  type PromoWindowValue,
} from "@/components/admin/PromoWindowFields";

export type QuantityPromoDraft = {
  name: string;
  active: boolean;
  stackable: boolean;
  includeDiscountedProducts: boolean;
  minItemPrice: number;
  maxDiscount: number | null;
  tiers: QuantityTier[];
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

type TierDraft = { minPieces: string; minValue: string; percent: string };

const emptyTier: TierDraft = { minPieces: "3", minValue: "", percent: "5" };

export default function QuantityPromoForm({
  id,
  initial,
}: {
  /** Brak = nowa promocja (POST); podany = edycja (PUT + usuwanie). */
  id?: string;
  initial?: QuantityPromoDraft;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name ?? "Rabat za większe zakupy",
    active: initial?.active ?? true,
    stackable: initial?.stackable ?? true,
    includeDiscountedProducts: initial?.includeDiscountedProducts ?? false,
    minItemPrice: initial?.minItemPrice?.toString() ?? "0",
    maxDiscount: initial?.maxDiscount?.toString() ?? "",
  });
  const [tiers, setTiers] = useState<TierDraft[]>(
    initial?.tiers?.length
      ? initial.tiers.map((t) => ({
          minPieces: String(t.minPieces),
          minValue: t.minValue !== null ? String(t.minValue) : "",
          percent: String(t.percent),
        }))
      : [emptyTier]
  );
  const [windowValue, setWindowValue] = useState<PromoWindowValue>(
    initial ? windowFrom(initial.startsAt, initial.endsAt) : emptyWindow()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setTier(index: number, field: keyof TierDraft, value: string) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  const parsedTiers = normalizeTiers(
    tiers.map((t) => ({
      minPieces: t.minPieces,
      minValue: t.minValue === "" ? null : t.minValue,
      percent: t.percent,
    }))
  );

  // Podgląd na żywo: przykładowy koszyk liczony **tą samą funkcją**, którą liczy
  // sklep. Właściciel widzi od razu, co dostanie klient, zamiast zgadywać z progów.
  const preview = (() => {
    const minPrice = Number(form.minItemPrice) || 0;
    const unit = Math.max(100, minPrice);
    const promo = {
      name: form.name,
      active: true,
      startsAt: null,
      endsAt: null,
      stackable: form.stackable,
      includeDiscountedProducts: form.includeDiscountedProducts,
      minItemPrice: minPrice,
      maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
      tiers: parsedTiers,
    };
    return parsedTiers.map((tier) => {
      const r = applyQuantityDiscount([{ price: unit, quantity: tier.minPieces }], promo);
      const before = unit * tier.minPieces;
      return {
        tier,
        unit,
        before,
        after: Math.round((before - r.discountTotal) * 100) / 100,
        saved: r.discountTotal,
      };
    });
  })();

  const windowError = parseWindow(windowValue).error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (windowError) {
      setError(windowError);
      return;
    }
    setSaving(true);

    const { startsAt, endsAt } = parseWindow(windowValue);
    const res = await fetch(
      id ? `/api/admin/promocje/ilosciowe/${id}` : "/api/admin/promocje/ilosciowe",
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          active: form.active,
          stackable: form.stackable,
          includeDiscountedProducts: form.includeDiscountedProducts,
          minItemPrice: form.minItemPrice,
          maxDiscount: form.maxDiscount === "" ? null : form.maxDiscount,
          tiers: tiers.map((t) => ({
            minPieces: t.minPieces,
            minValue: t.minValue === "" ? null : t.minValue,
            percent: t.percent,
          })),
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
    const res = await fetch(`/api/admin/promocje/ilosciowe/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nie udało się usunąć promocji");
      setSaving(false);
      return;
    }
    router.push("/admin/promocje");
    router.refresh();
  }

  const inputCls =
    "w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <div className="min-w-0">
        <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
          Nazwa promocji *
        </label>
        <input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={100}
          className={inputCls}
        />
        <p className="text-[11px] text-charcoal/80 mt-1">Widoczna tylko w panelu.</p>
      </div>

      {/* Progi */}
      <div className="border border-sand/60 bg-warm-white p-4">
        <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Progi rabatu</p>
        <div className="space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <div className="min-w-0">
                <label className="block text-[11px] text-charcoal/80 mb-1.5">Od ilu sztuk *</label>
                <input
                  required
                  type="number"
                  min="2"
                  step="1"
                  value={tier.minPieces}
                  onChange={(e) => setTier(i, "minPieces", e.target.value)}
                  className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] text-charcoal/80 mb-1.5">
                  Min. wartość (zł)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tier.minValue}
                  onChange={(e) => setTier(i, "minValue", e.target.value)}
                  placeholder="bez warunku"
                  className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] text-charcoal/80 mb-1.5">Rabat (%) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={MAX_DISCOUNT_PERCENT}
                  step="1"
                  value={tier.percent}
                  onChange={(e) => setTier(i, "percent", e.target.value)}
                  className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setTiers((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={tiers.length === 1}
                aria-label="Usuń próg"
                className="inline-flex items-center justify-center border border-sand text-red-700 hover:bg-red-50 disabled:text-charcoal/80 disabled:hover:bg-transparent disabled:cursor-not-allowed px-3 py-2.5 transition-colors"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
        {tiers.length < MAX_TIERS && (
          <button
            type="button"
            onClick={() => setTiers((prev) => [...prev, emptyTier])}
            className="mt-3 inline-flex items-center gap-2 border border-sand text-espresso hover:bg-sand text-xs tracking-widest uppercase px-4 py-2 transition-colors"
          >
            <Plus size={13} strokeWidth={1.5} />
            Dodaj próg
          </button>
        )}
        <p className="text-[11px] text-charcoal/80 mt-3 leading-relaxed">
          Próg zaczyna się od 2 sztuk, a każdy kolejny musi dawać <strong>wyższy</strong> rabat –
          inaczej klient traciłby na dołożeniu sztuki. Gdy podasz też minimalną wartość, muszą być
          spełnione <strong>oba</strong> warunki naraz.
        </p>
      </div>

      {/* Podgląd */}
      {preview.length > 0 && (
        <div className="border border-sand bg-cream p-4">
          <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">
            Co dostanie klient
          </p>
          <ul className="space-y-1 text-xs text-charcoal/80">
            {preview.map(({ tier, unit, before, after, saved }) => (
              <li key={`${tier.minPieces}-${tier.percent}`}>
                {tier.minPieces} szt. po {unit.toFixed(2).replace(".", ",")} zł:{" "}
                <span className="line-through">{before.toFixed(2).replace(".", ",")} zł</span>{" "}
                <strong className="text-espresso">{after.toFixed(2).replace(".", ",")} zł</strong>{" "}
                <span className="text-green-700">
                  (oszczędza {saved.toFixed(2).replace(".", ",")} zł)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PromoWindowFields value={windowValue} onChange={setWindowValue} noun="Promocja" />

      {/* Zabezpieczenia */}
      <div className="border border-sand/60 bg-warm-white p-4 space-y-4">
        <p className="text-xs tracking-widest uppercase text-charcoal/80">Zabezpieczenia</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-[11px] text-charcoal/80 mb-1.5">
              Minimalna cena pozycji (zł)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minItemPrice}
              onChange={(e) => set("minItemPrice", e.target.value)}
              className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
            />
            <p className="text-[11px] text-charcoal/80 mt-1 leading-relaxed">
              Tańsze pozycje <strong>nie liczą się do progu i nie dostają rabatu</strong> – blokuje
              dobijanie progu drobiazgami. 0 = bez ograniczenia.
            </p>
          </div>
          <div className="min-w-0">
            <label className="block text-[11px] text-charcoal/80 mb-1.5">
              Limit rabatu na zamówienie (zł)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              placeholder="bez limitu"
              className="w-full min-w-0 bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-espresso text-sm"
            />
            <p className="text-[11px] text-charcoal/80 mt-1">
              Górna granica kwoty rabatu przy dużych koszykach.
            </p>
          </div>
        </div>
      </div>

      {/* Zasady łączenia */}
      <div className="border border-sand/60 bg-warm-white p-4 space-y-3">
        <label className="flex items-start gap-3 text-sm text-espresso cursor-pointer">
          <input
            type="checkbox"
            checked={form.stackable}
            onChange={(e) => set("stackable", e.target.checked)}
            className="mt-0.5 accent-clay shrink-0"
          />
          <span>
            Łączy się z kodami rabatowymi
            <span className="block text-xs text-charcoal/80 mt-1 leading-relaxed">
              Zaznaczone: kod schodzi dodatkowo z cen obniżonych już rabatem ilościowym.
              Odznaczone: rabat ilościowy i kod się wykluczają, a sklep zostawia{" "}
              <strong>korzystniejszy dla klienta</strong> wariant.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-espresso cursor-pointer">
          <input
            type="checkbox"
            checked={form.includeDiscountedProducts}
            onChange={(e) => set("includeDiscountedProducts", e.target.checked)}
            className="mt-0.5 accent-clay shrink-0"
          />
          <span>
            Obejmuje produkty z własną przeceną
            <span className="block text-xs text-charcoal/80 mt-1 leading-relaxed">
              Zaznaczone: przecenione produkty liczą się do progu i dostają dodatkowy rabat –
              upusty się kumulują. Odznaczone (zalecane): przecenione produkty stoją obok promocji.
            </span>
          </span>
        </label>
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
