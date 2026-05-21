"use client";

import { useState, useEffect } from "react";
import { MapPin, CheckCircle } from "lucide-react";

interface Address {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  postcode: string;
}

const empty: Address = {
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  city: "",
  postcode: "",
};

export default function AddressPage() {
  const [form, setForm] = useState<Address>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/account/address")
      .then((r) => r.json())
      .then((data) => {
        if (data.address) setForm(data.address);
        setLoading(false);
      });
  }, []);

  function set(field: keyof Address, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/account/address", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <div className="text-charcoal/50 text-sm">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="font-serif text-2xl text-espresso">Adres dostawy</h2>

      <div className="bg-cream p-8">
        <h3 className="text-xs tracking-widest uppercase text-clay mb-2 flex items-center gap-2">
          <MapPin size={14} strokeWidth={1.5} />
          Domyślny adres dostawy
        </h3>
        <p className="text-xs text-charcoal/50 mb-6">
          Dane zostaną automatycznie uzupełnione przy kolejnym zamówieniu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                Imię
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                Nazwisko
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
              Telefon
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
            />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
              Ulica i numer
            </label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                Kod pocztowy
              </label>
              <input
                type="text"
                value={form.postcode}
                onChange={(e) => set("postcode", e.target.value)}
                placeholder="00-000"
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                Miasto
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-terracotta hover:bg-clay disabled:bg-sand text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            {saved ? (
              <>
                <CheckCircle size={14} /> Zapisano
              </>
            ) : saving ? (
              "Zapisywanie..."
            ) : (
              "Zapisz adres"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
