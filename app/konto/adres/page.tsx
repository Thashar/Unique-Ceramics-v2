"use client";

import { useState, useEffect } from "react";
import { MapPin, CheckCircle } from "lucide-react";
import { validateAddress } from "@/lib/address-validation";

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

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

export default function AddressPage() {
  const [form, setForm] = useState<Address>(empty);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState("");

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
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = validateAddress({
      firstName: form.firstName,
      lastName:  form.lastName,
      phone:     form.phone,
      street:    form.street,
      postcode:  form.postcode,
      city:      form.city,
    });
    if (!result.valid) {
      setFieldErrors(result.errors as Record<string, string>);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/account/address", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.errors) setFieldErrors(data.errors);
      else setServerError(data.error ?? "Nie udało się zapisać adresu.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = (field: string) =>
    `w-full bg-warm-white border ${fieldErrors[field] ? "border-red-400" : "border-sand"} focus:border-clay outline-none px-4 py-3 text-espresso text-sm`;

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

        {serverError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {serverError}
          </div>
        )}

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
                autoComplete="given-name"
                className={inputCls("firstName")}
              />
              <FieldError msg={fieldErrors.firstName} />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                Nazwisko
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                autoComplete="family-name"
                className={inputCls("lastName")}
              />
              <FieldError msg={fieldErrors.lastName} />
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
              autoComplete="tel"
              placeholder="668443706"
              className={inputCls("phone")}
            />
            <FieldError msg={fieldErrors.phone} />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
              Ulica i numer
            </label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
              autoComplete="street-address"
              placeholder="np. Różana 1 lub Kwiatowa 2/3"
              className={inputCls("street")}
            />
            <FieldError msg={fieldErrors.street} />
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
                autoComplete="postal-code"
                placeholder="44-111"
                className={inputCls("postcode")}
              />
              <FieldError msg={fieldErrors.postcode} />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                Miasto
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                autoComplete="address-level2"
                className={inputCls("city")}
              />
              <FieldError msg={fieldErrors.city} />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta disabled:bg-sand text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
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
