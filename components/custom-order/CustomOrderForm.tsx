"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/seo";
import { localePath } from "@/lib/i18n";
import { t } from "@/lib/dictionary";
import { useLocale } from "@/lib/use-locale";

export default function CustomOrderForm({ productSlug = "" }: { productSlug?: string }) {
  const locale = useLocale();
  const d = t(locale).custom;
  // Rodzaje zamówienia idą do panelu **zawsze po polsku** – w selekcie stoi
  // etykieta w języku strony, a wysyłamy polską wartość o tym samym indeksie
  const orderTypeLabels = d.orderTypes;
  const orderTypeValues = t("pl").custom.orderTypes;
  // Slug produktu z `?produkt=` (karta produktu w wersji angielskiej) – ten sam
  // wzorzec co adresy produktów, więc w treści ląduje wyłącznie nasz własny link
  const safeSlug = /^[a-z0-9-]{1,120}$/.test(productSlug) ? productSlug : "";
  const productLine = safeSlug
    ? `${d.productInterest(`${SITE_URL}${localePath(locale, `/sklep/${safeSlug}`)}`)}\n\n`
    : "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderTypeIdx, setOrderTypeIdx] = useState(0);
  const [description, setDescription] = useState(productLine);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/custom-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          orderType: orderTypeValues[orderTypeIdx] ?? orderTypeValues[0],
          // Dopisek, skąd przyszło zapytanie – po polsku pusty
          description: d.fromEnglish ? `${d.fromEnglish}\n${description}` : description,
          deadline,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || d.error);
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setOrderTypeIdx(0);
      setDescription("");
      setDeadline("");
    } catch {
      setError(d.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1">
      <div className="bg-cream px-6 lg:px-10 py-10">
        <div className="max-w-7xl mx-auto max-w-2xl">
          <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">{d.eyebrow}</p>
          <h1 className="font-serif text-5xl text-espresso mb-6">{d.title}</h1>
          <p className="text-charcoal/80 leading-relaxed">{d.intro}</p>
        </div>
      </div>

      <div className="bg-warm-white py-20 px-6 lg:px-10">
        <div className="max-w-2xl mx-auto">
          {success ? (
            <div className="bg-green-50 border border-green-200 p-8 text-center rounded-xl">
              <p className="text-green-800 font-medium text-lg mb-2">{d.successTitle}</p>
              <p className="text-green-700 text-sm">{d.successText}</p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-6 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
              >
                {d.again}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                    {d.fullName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                    {d.email} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                  {d.phone}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                  {d.orderType}
                </label>
                <select
                  value={orderTypeIdx}
                  onChange={(e) => setOrderTypeIdx(Number(e.target.value))}
                  className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm rounded-md"
                >
                  {orderTypeLabels.map((label, i) => (
                    <option key={label} value={i}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                  {d.description} *
                </label>
                <textarea
                  required
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={d.descriptionPlaceholder}
                  className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                  {d.deadline}
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm rounded-md"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase py-5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed rounded-md"
              >
                {loading ? d.sending : d.submit}
              </button>
            </form>
          )}

          <div className="mt-12 p-8 bg-cream text-sm text-charcoal/80 leading-relaxed space-y-2 rounded-xl">
            <p className="font-medium text-espresso text-base mb-4">{d.nextTitle}</p>
            {d.nextSteps.map((step) => (
              <p key={step}>{step}</p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
