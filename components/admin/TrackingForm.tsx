"use client";

import { useState } from "react";
import { Truck, ExternalLink } from "lucide-react";

const CARRIERS = [
  { value: "dpd",     label: "DPD",           trackUrl: (n: string) => `https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=${n}` },
  { value: "dhl",     label: "DHL",           trackUrl: (n: string) => `https://www.dhl.com/pl-pl/home/tracking/tracking-express.html?submit=1&tracking-id=${n}` },
  { value: "inpost",  label: "InPost",        trackUrl: (n: string) => `https://inpost.pl/sledzenie-przesylek?number=${n}` },
  { value: "poczta",  label: "Poczta Polska", trackUrl: (n: string) => `https://emonitoring.poczta-polska.pl/?numer=${n}` },
] as const;

type Carrier = (typeof CARRIERS)[number]["value"];

interface Props {
  orderId: string;
  orderStatus: string;
  initialTrackingNumber?: string | null;
  initialCarrier?: string | null;
}

export default function TrackingForm({ orderId, orderStatus, initialTrackingNumber, initialCarrier }: Props) {
  const editable = orderStatus === "IN_PROGRESS";
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber ?? "");
  const [carrier, setCarrier] = useState<Carrier | "">(
    CARRIERS.some((c) => c.value === initialCarrier) ? (initialCarrier as Carrier) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const carrierData = CARRIERS.find((c) => c.value === carrier);
  const trackingUrl = carrierData && trackingNumber.trim()
    ? carrierData.trackUrl(trackingNumber.trim())
    : null;

  async function handleSave() {
    if (!trackingNumber.trim() || !carrier) {
      setError("Wypełnij numer listu i wybierz dostawcę.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber: trackingNumber.trim(), trackingCarrier: carrier }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Błąd zapisu.");
    }
  }

  return (
    <div className="space-y-4">
      {!editable && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
          Dane listu przewozowego można uzupełnić tylko gdy zamówienie ma status <strong>W realizacji</strong>.
        </p>
      )}

      <div className={`grid grid-cols-2 gap-3 ${!editable ? "opacity-50 pointer-events-none select-none" : ""}`}>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Dostawca</label>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value as Carrier | "")}
            disabled={!editable}
            className="w-full border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-clay disabled:cursor-not-allowed"
          >
            <option value="">Wybierz dostawcę</option>
            {CARRIERS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Numer listu przewozowego</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="np. 00123456789"
            disabled={!editable}
            className="w-full border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-clay disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {editable && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-clay hover:bg-espresso text-white text-xs uppercase tracking-wide px-4 py-2 transition-colors disabled:opacity-50"
          >
            <Truck size={14} />
            {saving ? "Zapisywanie…" : "Zapisz dane wysyłki"}
          </button>
          {saved && <span className="text-xs text-green-600 font-medium">Zapisano</span>}
        </div>
      )}

      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-clay hover:text-espresso transition-colors"
        >
          <ExternalLink size={13} />
          Sprawdź przesyłkę na stronie {carrierData?.label}
        </a>
      )}
    </div>
  );
}
