"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Mail } from "lucide-react";

const STATUSES = [
  { value: "NEW",       label: "Nowe" },
  { value: "IN_REVIEW", label: "W trakcie" },
  { value: "PAID",      label: "Opłacone" },
  { value: "DONE",      label: "Zrealizowane" },
  { value: "CANCELLED", label: "Anulowane" },
];

const STATUS_LABEL: Record<string, string> = {
  NEW:       "Nowe",
  IN_REVIEW: "W trakcie",
  PAID:      "Opłacone",
  DONE:      "Zrealizowane",
  CANCELLED: "Anulowane",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] tracking-widest uppercase text-charcoal/50 mb-1">{label}</p>
      {children}
    </div>
  );
}

export default function CustomOrderActions({
  orderId,
  currentStatus,
  currentNotes,
  currentPrice,
  currentShippingCost,
  currentPaidAmount,
  currentCustomerName,
  currentCustomerEmail,
  currentCustomerPhone,
  currentStreet,
  currentCity,
  currentPostcode,
}: {
  orderId: string;
  currentStatus: string;
  currentNotes: string | null;
  currentPrice: number | null;
  currentShippingCost: number | null;
  currentPaidAmount: number | null;
  currentCustomerName: string;
  currentCustomerEmail: string;
  currentCustomerPhone: string | null;
  currentStreet: string | null;
  currentCity: string | null;
  currentPostcode: string | null;
}) {
  const router = useRouter();

  // Dane klienta
  const [customerUnlocked, setCustomerUnlocked] = useState(false);
  const [customerName,  setCustomerName]  = useState(currentCustomerName);
  const [customerEmail, setCustomerEmail] = useState(currentCustomerEmail);
  const [customerPhone, setCustomerPhone] = useState(currentCustomerPhone ?? "");
  const [street,   setStreet]   = useState(currentStreet   ?? "");
  const [city,     setCity]     = useState(currentCity     ?? "");
  const [postcode, setPostcode] = useState(currentPostcode ?? "");

  // Status i finanse
  const [status,       setStatus]       = useState(currentStatus);
  const [price,        setPrice]        = useState(currentPrice        != null ? String(currentPrice)        : "");
  const [shippingCost, setShippingCost] = useState(currentShippingCost != null ? String(currentShippingCost) : "");
  const [paidAmount,   setPaidAmount]   = useState(currentPaidAmount   != null ? String(currentPaidAmount)   : "");
  const [notes,        setNotes]        = useState(currentNotes ?? "");

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  const mailSubject = encodeURIComponent("Odpowiedz na zamowienie indywidualne");

  function handleStatusChange(newStatus: string) {
    if (newStatus === "PAID" && (!paidAmount || parseFloat(paidAmount) <= 0)) {
      alert('Aby ustalic status "Oplacone", wpisz najpierw kwote wplacona (pole powyzej).');
      return;
    }
    const label = STATUS_LABEL[newStatus] ?? newStatus;
    if (!window.confirm(`Zmienic status na "${label}"?`)) return;
    setStatus(newStatus);
    setSaved(false);
    setError("");
  }

  async function handleSave() {
    if (status === "PAID" && (!paidAmount || parseFloat(paidAmount) <= 0)) {
      setError('Status "Oplacone" wymaga kwoty wplaconej wiekszej niz 0.');
      return;
    }

    const label = STATUS_LABEL[status] ?? status;
    if (!window.confirm(`Zapisac zmiany? Status zostanie ustawiony na "${label}".`)) return;

    setSaving(true);
    setSaved(false);
    setError("");

    const body: Record<string, unknown> = {
      status,
      adminNotes:  notes,
      price:        price        ? parseFloat(price)        : null,
      shippingCost: shippingCost ? parseFloat(shippingCost) : null,
      paidAmount:   paidAmount   ? parseFloat(paidAmount)   : null,
    };

    if (customerUnlocked) {
      body.customerName  = customerName;
      body.customerEmail = customerEmail;
      body.customerPhone = customerPhone || null;
      body.street        = street   || null;
      body.city          = city     || null;
      body.postcode      = postcode || null;
    }

    try {
      const res = await fetch(`/api/admin/custom-orders/${orderId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Blad zapisu");
      } else {
        setSaved(true);
        if (customerUnlocked) setCustomerUnlocked(false);
        router.refresh();
      }
    } catch {
      setError("Blad polaczenia z serwerem");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-warm-white border border-clay outline-none px-4 py-2 text-sm text-espresso";
  const textCls  = "text-sm text-charcoal/80";

  return (
    <div className="space-y-6">

      {/* ── Dane klienta (z odblokowaniem) ─────────────────────────────────── */}
      <div className="bg-cream p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Dane klienta</h2>
          <button
            onClick={() => setCustomerUnlocked((v) => !v)}
            className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
          >
            {customerUnlocked
              ? <><Unlock size={12} strokeWidth={1.5} /> Zablokuj</>
              : <><Lock    size={12} strokeWidth={1.5} /> Odblokuj edycje</>
            }
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Imie i nazwisko">
            {customerUnlocked
              ? <input type="text"  value={customerName}  maxLength={100} onChange={(e) => setCustomerName(e.target.value)}  className={inputCls} />
              : <p className="text-sm font-medium text-espresso">{customerName}</p>
            }
          </Field>

          <Field label="E-mail">
            {customerUnlocked
              ? <input type="email" value={customerEmail} maxLength={254} onChange={(e) => setCustomerEmail(e.target.value)} className={inputCls} />
              : <p className={textCls}>{customerEmail}</p>
            }
          </Field>

          <Field label="Telefon">
            {customerUnlocked
              ? <input type="text"  value={customerPhone} maxLength={20}  onChange={(e) => setCustomerPhone(e.target.value)} className={inputCls} />
              : <p className={textCls}>{customerPhone || "—"}</p>
            }
          </Field>

          {/* Adres */}
          <div className="pt-2 border-t border-sand">
            <p className="text-[10px] tracking-widest uppercase text-charcoal/40 mb-2">Adres dostawy</p>
            <div className="space-y-2">
              <Field label="Ulica / nr domu">
                {customerUnlocked
                  ? <input type="text" value={street}   maxLength={200} onChange={(e) => setStreet(e.target.value)}   className={inputCls} placeholder="np. Kwiatowa 5/3" />
                  : <p className={textCls}>{street || "—"}</p>
                }
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kod pocztowy">
                  {customerUnlocked
                    ? <input type="text" value={postcode} maxLength={20}  onChange={(e) => setPostcode(e.target.value)} className={inputCls} placeholder="00-000" />
                    : <p className={textCls}>{postcode || "—"}</p>
                  }
                </Field>
                <Field label="Miasto">
                  {customerUnlocked
                    ? <input type="text" value={city}     maxLength={100} onChange={(e) => setCity(e.target.value)}     className={inputCls} placeholder="Warszawa" />
                    : <p className={textCls}>{city || "—"}</p>
                  }
                </Field>
              </div>
            </div>
          </div>

          {!customerUnlocked && (
            <a
              href={`mailto:${customerEmail}?subject=${mailSubject}`}
              className="inline-flex items-center gap-2 mt-2 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
            >
              <Mail size={13} strokeWidth={1.5} />
              Odpowiedz e-mailem
            </a>
          )}
        </div>
      </div>

      {/* ── Status, cena, wysyłka, notatki ─────────────────────────────────── */}
      <div className="bg-cream p-6 space-y-4">
        <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Status i rozliczenie</h2>

        {/* Cena zamówienia */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Cena zamówienia (zł)
          </label>
          <input
            type="number" value={price} min="0" step="0.01" placeholder="0.00"
            onChange={(e) => { setPrice(e.target.value); setSaved(false); }}
            className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-2.5 text-sm text-espresso"
          />
        </div>

        {/* Koszt wysyłki */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Koszt wysyłki (zł)
          </label>
          <input
            type="number" value={shippingCost} min="0" step="0.01" placeholder="0.00"
            onChange={(e) => { setShippingCost(e.target.value); setSaved(false); }}
            className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-2.5 text-sm text-espresso"
          />
        </div>

        {/* Kwota wpłacona */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
            Kwota wpłacona (zł)
          </label>
          <input
            type="number" value={paidAmount} min="0" step="0.01" placeholder="0.00"
            onChange={(e) => { setPaidAmount(e.target.value); setSaved(false); }}
            className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-2.5 text-sm text-espresso"
          />
          <p className="text-[10px] text-charcoal/40 mt-1">
            Wymagane do ustawienia statusu Oplacone
          </p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Status</label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-2.5 text-sm text-espresso"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
                {s.value === "PAID" && (!paidAmount || parseFloat(paidAmount) <= 0)
                  ? " — wymagana kwota wplacona"
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Notatki */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Notatki admina</label>
          <textarea
            rows={4} value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder="Notatki wewnetrzne..."
            className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase px-6 py-2.5 transition-colors disabled:opacity-60"
          >
            {saving ? "Zapisuje..." : "Zapisz"}
          </button>
          {saved && <span className="text-xs text-green-600">Zapisano</span>}
        </div>
      </div>
    </div>
  );
}
