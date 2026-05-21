"use client";

import { useState } from "react";

type Tab = "regulamin" | "polityka" | "kontakt" | "wysylka";

interface Props {
  initial: {
    regulamin: string;
    polityka_prywatnosci: string;
    contact_phone: string;
    contact_email: string;
    contact_instagram: string;
    contact_hours: string;
    shipping_cost: string;
    shipping_free_enabled: string;
    shipping_free_from: string;
  };
}

export default function SettingsForm({ initial }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("regulamin");
  const [toast, setToast] = useState(false);

  // Regulamin
  const [regulamin, setRegulamin] = useState(initial.regulamin);

  // Polityka prywatności
  const [polityka, setPolityka] = useState(initial.polityka_prywatnosci);

  // Kontakt
  const [phone, setPhone] = useState(initial.contact_phone);
  const [email, setEmail] = useState(initial.contact_email);
  const [instagram, setInstagram] = useState(initial.contact_instagram);
  const [hours, setHours] = useState(initial.contact_hours);

  // Wysyłka
  const [shippingCost, setShippingCost] = useState(initial.shipping_cost);
  const [freeEnabled, setFreeEnabled] = useState(
    initial.shipping_free_enabled === "true"
  );
  const [freeFrom, setFreeFrom] = useState(initial.shipping_free_from);

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const save = async (pairs: { key: string; value: string }[]) => {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pairs),
    });
    showToast();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "regulamin", label: "Regulamin" },
    { id: "polityka", label: "Polityka prywatności" },
    { id: "kontakt", label: "Kontakt" },
    { id: "wysylka", label: "Wysyłka" },
  ];

  return (
    <div className="max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-espresso text-cream text-sm px-5 py-3 shadow-lg">
          Zapisano!
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 text-xs tracking-widest uppercase transition-colors ${
              activeTab === t.id
                ? "bg-espresso text-cream"
                : "bg-cream text-charcoal hover:bg-sand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Regulamin */}
      {activeTab === "regulamin" && (
        <div className="bg-cream p-6">
          <p className="text-xs text-charcoal/50 mb-4 leading-relaxed">
            Możesz używać HTML:{" "}
            <code className="bg-sand px-1">&lt;p&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;h2&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;ul&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;li&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;strong&gt;</code>
          </p>
          <textarea
            rows={20}
            value={regulamin}
            onChange={(e) => setRegulamin(e.target.value)}
            className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono transition-colors resize-y"
          />
          <button
            onClick={() => save([{ key: "regulamin", value: regulamin }])}
            className="mt-4 bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz regulamin
          </button>
        </div>
      )}

      {/* Tab: Polityka prywatności */}
      {activeTab === "polityka" && (
        <div className="bg-cream p-6">
          <p className="text-xs text-charcoal/50 mb-4 leading-relaxed">
            Możesz używać HTML:{" "}
            <code className="bg-sand px-1">&lt;p&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;h2&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;ul&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;li&gt;</code>,{" "}
            <code className="bg-sand px-1">&lt;strong&gt;</code>
          </p>
          <textarea
            rows={20}
            value={polityka}
            onChange={(e) => setPolityka(e.target.value)}
            className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm font-mono transition-colors resize-y"
          />
          <button
            onClick={() => save([{ key: "polityka_prywatnosci", value: polityka }])}
            className="mt-4 bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz politykę prywatności
          </button>
        </div>
      )}

      {/* Tab: Kontakt */}
      {activeTab === "kontakt" && (
        <div className="bg-cream p-6 space-y-5">
          {[
            {
              label: "Telefon",
              value: phone,
              setter: setPhone,
              key: "contact_phone",
              type: "tel",
            },
            {
              label: "E-mail",
              value: email,
              setter: setEmail,
              key: "contact_email",
              type: "email",
            },
            {
              label: "Instagram",
              value: instagram,
              setter: setInstagram,
              key: "contact_instagram",
              type: "text",
            },
            {
              label: "Godziny pracy",
              value: hours,
              setter: setHours,
              key: "contact_hours",
              type: "text",
            },
          ].map(({ label, value, setter, type }) => (
            <div key={label}>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
          ))}
          <button
            onClick={() =>
              save([
                { key: "contact_phone", value: phone },
                { key: "contact_email", value: email },
                { key: "contact_instagram", value: instagram },
                { key: "contact_hours", value: hours },
              ])
            }
            className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz kontakt
          </button>
        </div>
      )}

      {/* Tab: Wysyłka */}
      {activeTab === "wysylka" && (
        <div className="bg-cream p-6 space-y-6">
          {/* Toggle darmowej wysyłki */}
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-charcoal/60">
              Darmowa wysyłka
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={freeEnabled}
                onChange={(e) => setFreeEnabled(e.target.checked)}
              />
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  freeEnabled ? "bg-espresso" : "bg-sand"
                } relative`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-all ${
                    freeEnabled ? "left-7" : "left-1"
                  }`}
                />
              </div>
            </label>
          </div>

          {/* Koszt wysyłki */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
              Koszt wysyłki (zł)
            </label>
            <input
              type="number"
              min="0"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
            />
          </div>

          {/* Darmowa wysyłka od */}
          {freeEnabled && (
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">
                Darmowa wysyłka od (zł)
              </label>
              <input
                type="number"
                min="0"
                value={freeFrom}
                onChange={(e) => setFreeFrom(e.target.value)}
                className="w-full bg-warm-white border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm transition-colors"
              />
            </div>
          )}

          <button
            onClick={() =>
              save([
                { key: "shipping_cost", value: shippingCost },
                {
                  key: "shipping_free_enabled",
                  value: freeEnabled ? "true" : "false",
                },
                { key: "shipping_free_from", value: freeFrom },
              ])
            }
            className="bg-espresso hover:bg-clay text-cream text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Zapisz wysyłkę
          </button>
        </div>
      )}
    </div>
  );
}
