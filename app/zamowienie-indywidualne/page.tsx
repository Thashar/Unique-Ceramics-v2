"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const ORDER_TYPES = [
  "Zestaw ślubny",
  "Prezent firmowy",
  "Personalizacja (imię, data)",
  "Indywidualny projekt",
  "Inne",
];


export default function CustomOrderPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState(ORDER_TYPES[0]);
  const [description, setDescription] = useState("");
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
          orderType,
          description,
          deadline,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Wystąpił błąd. Spróbuj ponownie.");
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setOrderType(ORDER_TYPES[0]);
      setDescription("");
      setDeadline("");
    } catch {
      setError("Wystąpił błąd sieci. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-cream px-6 lg:px-10 py-20">
          <div className="max-w-7xl mx-auto max-w-2xl">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Na zamówienie</p>
            <h1 className="font-serif text-5xl text-espresso mb-6">Zamówienie indywidualne</h1>
            <p className="text-charcoal/70 leading-relaxed">
              Tworzę ceramikę na zamówienie — zestawy ślubne, prezenty firmowe lub spersowanlizowaną ceramikę, której nie ma w sklepie.
              Czas realizacji wynosi zazwyczaj 4+ tygodnie od potwierdzenia projektu.
            </p>
            <div className="mt-8 text-center">
              <Link
                href="/sklep"
                className="inline-flex items-center gap-2 border border-espresso hover:bg-espresso hover:text-cream text-espresso text-sm tracking-widest uppercase px-8 py-4 transition-colors"
              >
                Sklep
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-warm-white py-20 px-6 lg:px-10">
          <div className="max-w-2xl mx-auto">
            {success ? (
              <div className="bg-green-50 border border-green-200 p-8 text-center">
                <p className="text-green-800 font-medium text-lg mb-2">Zapytanie zostało wysłane!</p>
                <p className="text-green-700 text-sm">Odpiszę w ciągu 2 dni roboczych.</p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-6 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
                >
                  Wyślij kolejne zapytanie
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                      Imię i nazwisko *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                    Rodzaj zamówienia
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
                  >
                    {ORDER_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                    Opis zamówienia *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opisz co chcesz zamówić — rodzaj przedmiotów, ilość, preferowane kolory, rozmiary, styl..."
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                    Preferowany termin realizacji
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase py-5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Wysyłanie..." : "Wyślij zapytanie"}
                </button>
              </form>
            )}

            <div className="mt-12 p-8 bg-cream text-sm text-charcoal/70 leading-relaxed space-y-2">
              <p className="font-medium text-espresso text-base mb-4">Co dalej?</p>
              <p>1. Przesłę odpowiedź w ciągu 2 dni roboczych.</p>
              <p>2. Omówimy szczegóły projektu i ustalimy wycenę.</p>
              <p>3. Po akceptacji rozpoczynam pracę po wpłacie zaliczki 50%.</p>
              <p>4. Czas realizacji: 4+ tygodnie od potwierdzenia.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
