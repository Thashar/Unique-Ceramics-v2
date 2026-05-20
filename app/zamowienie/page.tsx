"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, SHIPPING, FREE_SHIPPING_THRESHOLD } from "@/lib/cart";
import { useSession } from "next-auth/react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { data: session } = useSession();

  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING;
  const total = subtotal + shippingCost;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: session?.user?.email ?? "",
    phone: "",
    street: "",
    city: "",
    postcode: "",
    note: "",
    paymentMethod: "transfer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[100svh] bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-2xl text-espresso mb-4">Koszyk jest pusty</p>
          <Link href="/sklep" className="text-clay hover:text-espresso underline">Przejdź do sklepu</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        items: items.map((i) => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        subtotal,
        shippingCost,
        total,
      }),
    });

    if (!res.ok) {
      setError("Wystąpił błąd. Spróbuj ponownie.");
      setLoading(false);
      return;
    }

    const { orderId } = await res.json();
    clearCart();
    router.push(`/zamowienie/potwierdzenie?id=${orderId}`);
  }

  return (
    <div className="min-h-[100svh] bg-warm-white">
      <div className="bg-cream pt-32 pb-12 px-6 text-center">
        <h1 className="font-serif text-5xl text-espresso">Zamówienie</h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Formularz */}
          <div className="lg:col-span-2 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
            )}

            <div>
              <h2 className="font-serif text-2xl text-espresso mb-6">Dane dostawy</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Imię *</label>
                  <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Nazwisko *</label>
                  <input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">E-mail *</label>
                  <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Telefon</label>
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Ulica i numer *</label>
                <input required value={form.street} onChange={(e) => set("street", e.target.value)}
                  className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Kod pocztowy *</label>
                  <input required value={form.postcode} onChange={(e) => set("postcode", e.target.value)}
                    placeholder="00-000"
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Miasto *</label>
                  <input required value={form.city} onChange={(e) => set("city", e.target.value)}
                    className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-serif text-2xl text-espresso mb-6">Płatność</h2>
              <div className="space-y-3">
                {[
                  { value: "transfer", label: "Przelew bankowy", desc: "Dane do przelewu otrzymasz e-mailem." },
                  { value: "blik", label: "BLIK", desc: "Numer BLIK podam po złożeniu zamówienia." },
                ].map((method) => (
                  <label key={method.value}
                    className={`flex items-start gap-4 p-4 border cursor-pointer transition-colors ${
                      form.paymentMethod === method.value ? "border-clay bg-cream" : "border-sand"
                    }`}
                  >
                    <input type="radio" name="payment" value={method.value}
                      checked={form.paymentMethod === method.value}
                      onChange={() => set("paymentMethod", method.value)}
                      className="mt-0.5 accent-clay" />
                    <div>
                      <p className="text-sm font-medium text-espresso">{method.label}</p>
                      <p className="text-xs text-charcoal/50 mt-0.5">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/60 mb-2">Uwagi do zamówienia</label>
              <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={3}
                className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none" />
            </div>
          </div>

          {/* Podsumowanie */}
          <div className="lg:col-span-1">
            <div className="bg-cream p-8 sticky top-28">
              <h2 className="font-serif text-xl text-espresso mb-6">Twoje zamówienie</h2>
              <div className="space-y-3 mb-6 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-charcoal/70">
                    <span className="truncate pr-2">{item.name} × {item.quantity}</span>
                    <span className="shrink-0">{(item.price * item.quantity).toFixed(2).replace(".", ",")} zł</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-sand pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-charcoal/70">
                  <span>Wysyłka</span>
                  <span>{shippingCost === 0 ? <span className="text-green-600">Gratis</span> : `${shippingCost} zł`}</span>
                </div>
                <div className="flex justify-between font-serif text-xl text-espresso pt-2 border-t border-sand">
                  <span>Razem</span>
                  <span>{total.toFixed(2).replace(".", ",")} zł</span>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-6 bg-terracotta hover:bg-clay disabled:bg-sand disabled:text-charcoal/40 text-warm-white text-xs tracking-widest uppercase py-4 transition-colors">
                {loading ? "Składam zamówienie..." : "Złóż zamówienie"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
