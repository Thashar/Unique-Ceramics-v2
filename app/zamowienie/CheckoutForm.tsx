"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, Package, MapPin } from "lucide-react";
import { useCart } from "@/lib/cart";
import { bundleSummary, type BundleConfig } from "@/lib/bundled-shipping";
import { validateAddress } from "@/lib/address-validation";
import ClayRule from "@/components/ui/ClayRule";
import dynamic from "next/dynamic";

const InPostWidget = dynamic(() => import("@/components/checkout/InPostWidget"), { ssr: false });

export interface PaymentMethod {
  value: string;
  label: string;
  desc: string;
}

export interface SavedAddress {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  postcode: string;
}

interface Props {
  bundle: BundleConfig;
  isLoggedIn: boolean;
  userEmail: string;
  savedAddress: SavedAddress | null;
  paymentMethods: PaymentMethod[];
  shippingCostCourier: number;
  shippingCostParcelLocker: number;
  shippingFreeEnabled: boolean;
  shippingFreeFrom: number;
  inpostToken: string | null;
  savedAddressComplete: boolean | null; // null = gość
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-700">{msg}</p>;
}

const SHIPPING_METHODS = [
  { value: "courier",       label: "Kurier",            icon: Truck,   desc: "Dostawa pod wskazany adres. Czas dostawy: 1–3 dni robocze." },
  { value: "parcel_locker", label: "Paczkomat InPost",  icon: Package, desc: "Odbiór z wybranego paczkomatu. Czas dostawy: 1–2 dni robocze." },
  { value: "pickup",        label: "Odbiór osobisty",   icon: MapPin,  desc: "Odbiór osobisty w pracowni – Familijna 23, 44-164 Kleszczów. Bezpłatny." },
] as const;

export default function CheckoutForm({
  bundle,
  isLoggedIn,
  userEmail,
  savedAddress,
  paymentMethods,
  shippingCostCourier,
  shippingCostParcelLocker,
  shippingFreeEnabled,
  shippingFreeFrom,
  inpostToken,
  savedAddressComplete,
}: Props) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const [shippingMethod, setShippingMethod] = useState<"courier" | "parcel_locker" | "pickup">("courier");
  const [parcelLockerCode, setParcelLockerCode] = useState("");

  // Koszt wysyłki zależy od wybranej metody; darmowa wysyłka stosuje się do obu.
  // W teście „wysyłka w cenie" próg nie działa – wysyłka jest już doliczona
  // do ceny pierwszego produktu (tak samo liczy serwer w /api/checkout)
  function methodShippingCost(method: string): number {
    if (method === "pickup") return 0;
    const raw = method === "parcel_locker" ? shippingCostParcelLocker : shippingCostCourier;
    if (bundle.enabled) return raw;
    return shippingFreeEnabled && subtotal >= shippingFreeFrom ? 0 : raw;
  }

  const shipping = methodShippingCost(shippingMethod);
  const total = subtotal + shipping;
  // Rozbicie pozycji na ceny pokazywane klientowi: przy teście „wysyłka w cenie"
  // narzut niesie pierwsza pozycja, przy odbiorze osobistym nie ma go wcale
  const summary = bundleSummary(
    items,
    bundle.enabled && shipping > 0 ? bundle : { enabled: false, surcharge: 0 }
  );

  // Zablokuj złożenie zamówienia jeśli zalogowany użytkownik nie ma kompletnego adresu
  // (null = gość – brak blokady; false = niekompletny; true = OK)
  const addressBlocked = savedAddressComplete === false && shippingMethod !== "pickup";

  const [form, setForm] = useState({
    firstName: savedAddress?.firstName ?? "",
    lastName:  savedAddress?.lastName  ?? "",
    email:     userEmail,
    phone:     savedAddress?.phone     ?? "",
    street:    savedAddress?.street    ?? "",
    city:      savedAddress?.city      ?? "",
    postcode:  savedAddress?.postcode  ?? "",
    note:      "",
    paymentMethod: paymentMethods[0]?.value ?? "transfer",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Gość akceptuje regulamin przy zamówieniu (zalogowany zrobił to przy rejestracji)
  const [acceptTerms, setAcceptTerms] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  }

  // Telefon jest wymagany przy dostawie – kurier dzwoni przed doręczeniem,
  // a InPost wysyła powiadomienie o paczce SMS-em. Przy odbiorze osobistym opcjonalny.
  const phoneRequired = shippingMethod !== "pickup";

  function validateForm(): boolean {
    const result = validateAddress({
      firstName: form.firstName,
      lastName:  form.lastName,
      phone:     form.phone,
      street:    shippingMethod === "pickup" ? "Odbiór osobisty" : form.street,
      postcode:  shippingMethod === "pickup" ? "00-000"          : form.postcode,
      city:      shippingMethod === "pickup" ? "Kleszczów"       : form.city,
    });

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const errors: Record<string, string> = { ...result.errors };
    if (!emailOk) errors.email = "Nieprawidłowy adres e-mail";

    if (phoneRequired && !form.phone.trim()) {
      errors.phone = "Telefon jest wymagany przy wysyłce";
    }

    if (shippingMethod === "parcel_locker" && !parcelLockerCode.trim()) {
      errors.parcelLocker = "Wybierz lub wpisz kod paczkomatu";
    }

    if (!isLoggedIn && !acceptTerms) {
      errors.terms = "Zaakceptuj regulamin i politykę prywatności";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
    if (!validateForm()) return;
    setLoading(true);
    setError("");

    const street   = shippingMethod === "pickup" ? "Odbiór osobisty" : form.street;
    const postcode = shippingMethod === "pickup" ? ""                 : form.postcode;
    const city     = shippingMethod === "pickup" ? "Kleszczów"        : form.city;

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        street,
        postcode,
        city,
        shippingMethod,
        acceptTerms: isLoggedIn ? true : acceptTerms,
        parcelLockerCode: shippingMethod === "parcel_locker" ? parcelLockerCode.trim() : null,
        items: items.map((i) => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        subtotal,
        shippingCost: shipping,
        total,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    clearCart();
    if (data.stripeUrl) {
      window.location.href = data.stripeUrl;
    } else {
      router.push(`/zamowienie/potwierdzenie?id=${data.orderId}`);
    }
  }

  const inputCls = (field: string) =>
    `w-full bg-cream border ${fieldErrors[field] ? "border-red-400" : "border-sand"} focus:border-clay outline-none px-4 py-3 text-espresso text-sm`;

  return (
    <div className="min-h-[100svh] bg-warm-white">
      <div className="bg-cream pt-28 pb-10 px-6 lg:px-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Sklep</p>
          <h1 className="font-serif text-4xl md:text-5xl text-espresso">Zamówienie</h1>
          <ClayRule className="mt-6" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
            )}

            {/* Zamówienie bez konta – logowanie jest opcjonalne */}
            {!isLoggedIn && (
              <div className="bg-cream border border-sand px-5 py-4 text-sm text-charcoal/80">
                <p className="text-espresso font-medium mb-1">Zamawiasz jako gość</p>
                <p className="leading-relaxed">
                  Nie musisz zakładać konta – wystarczy, że podasz dane do wysyłki.
                  Potwierdzenie zamówienia wyślemy na podany adres e-mail.{" "}
                  <Link href="/logowanie?callbackUrl=/zamowienie" className="text-clay hover:text-espresso underline">
                    Masz konto? Zaloguj się
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* Dane kontaktowe */}
            <div>
              <h2 className="font-serif text-2xl text-espresso mb-6">Dane kontaktowe</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Imię *</label>
                  <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" className={inputCls("firstName")} />
                  <FieldError msg={fieldErrors.firstName} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Nazwisko *</label>
                  <input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" className={inputCls("lastName")} />
                  <FieldError msg={fieldErrors.lastName} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">E-mail *</label>
                  <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className={inputCls("email")} />
                  <FieldError msg={fieldErrors.email} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">
                    Telefon {phoneRequired && "*"}
                  </label>
                  <input required={phoneRequired} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" className={inputCls("phone")} />
                  <FieldError msg={fieldErrors.phone} />
                </div>
              </div>
            </div>

            {/* Metoda wysyłki */}
            <div>
              <h2 className="font-serif text-2xl text-espresso mb-6">Metoda wysyłki</h2>
              <div className="space-y-3">
                {SHIPPING_METHODS.map(({ value, label, icon: Icon, desc }) => (
                  <label
                    key={value}
                    className={`flex items-start gap-4 p-4 border cursor-pointer transition-colors ${
                      shippingMethod === value ? "border-clay bg-cream" : "border-sand"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={value}
                      checked={shippingMethod === value}
                      onChange={() => { setShippingMethod(value); setParcelLockerCode(""); }}
                      className="mt-0.5 accent-clay"
                    />
                    <Icon size={18} strokeWidth={1.5} className="text-clay mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-espresso">{label}</p>
                        {(() => {
                          const cost = methodShippingCost(value);
                          if (value === "pickup") return <span className="text-xs text-green-700 font-medium">Bezpłatne</span>;
                          if (cost === 0) return <span className="text-xs text-green-700 font-medium">Gratis</span>;
                          return <span className="text-xs text-charcoal/80">{cost} zł</span>;
                        })()}
                      </div>
                      <p className="text-xs text-charcoal/80 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Widget paczkomatu */}
              {shippingMethod === "parcel_locker" && (
                <div className="mt-4">
                  <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-3">Wybierz paczkomat *</p>
                  <InPostWidget token={inpostToken} value={parcelLockerCode} onChange={setParcelLockerCode} />
                  <FieldError msg={fieldErrors.parcelLocker} />
                </div>
              )}
            </div>

            {/* Adres dostawy – ukryty przy odbiorze osobistym */}
            {shippingMethod !== "pickup" && (
              <div>
                <h2 className="font-serif text-2xl text-espresso mb-6">Adres dostawy</h2>
                {addressBlocked && (
                  <div className="bg-amber-50 border border-amber-300 px-4 py-3 mb-6 text-sm text-amber-800">
                    Aby złożyć zamówienie, uzupełnij najpierw adres dostawy w{" "}
                    <Link href="/konto/adres" className="font-semibold underline hover:text-amber-900">
                      ustawieniach konta
                    </Link>
                    .
                  </div>
                )}
                <div className="mt-4">
                  <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Ulica i numer *</label>
                  <input required value={form.street} onChange={(e) => set("street", e.target.value)} autoComplete="street-address" placeholder="np. Różana 1 lub Kwiatowa 2/3" className={inputCls("street")} />
                  <FieldError msg={fieldErrors.street} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Kod pocztowy *</label>
                    <input required value={form.postcode} onChange={(e) => set("postcode", e.target.value)} autoComplete="postal-code" placeholder="44-111" className={inputCls("postcode")} />
                    <FieldError msg={fieldErrors.postcode} />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Miasto *</label>
                    <input required value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" className={inputCls("city")} />
                    <FieldError msg={fieldErrors.city} />
                  </div>
                </div>
              </div>
            )}

            {/* Płatność */}
            <div>
              <h2 className="font-serif text-2xl text-espresso mb-6">Płatność</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-start gap-4 p-4 border cursor-pointer transition-colors ${
                      form.paymentMethod === method.value ? "border-clay bg-cream" : "border-sand"
                    }`}
                  >
                    <input type="radio" name="payment" value={method.value} checked={form.paymentMethod === method.value} onChange={() => set("paymentMethod", method.value)} className="mt-0.5 accent-clay" />
                    <div>
                      <p className="text-sm font-medium text-espresso">{method.label}</p>
                      <p className="text-xs text-charcoal/80 mt-0.5">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Uwagi */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/80 mb-2">Uwagi do zamówienia</label>
              <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={3} className="w-full bg-cream border border-sand focus:border-clay outline-none px-4 py-3 text-espresso text-sm resize-none" />
            </div>
          </div>

          {/* Podsumowanie */}
          <div className="lg:col-span-1">
            <div className="bg-cream p-8 sticky top-28">
              <h2 className="font-serif text-xl text-espresso mb-6">Twoje zamówienie</h2>
              <div className="space-y-3 mb-6 text-sm">
                {summary.lines.map(({ item, lineTotal, wasPrice, discountPercent }) => (
                  <div key={item.id} className="flex justify-between gap-2 text-charcoal/80">
                    {/* Długie nazwy zawijamy zamiast ucinać – klient musi widzieć, co zamawia */}
                    <span className="min-w-0 break-words">
                      {item.name} × {item.quantity}
                      {wasPrice !== null && discountPercent > 0 && (
                        <span className="text-green-700"> · −{discountPercent}%</span>
                      )}
                    </span>
                    <span className="shrink-0">{lineTotal.toFixed(2).replace(".", ",")} zł</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-sand pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-charcoal/80">
                  <span>Wysyłka</span>
                  <span>
                    {bundle.enabled && shipping > 0 ? (
                      <span className="text-green-700">Darmowa wysyłka</span>
                    ) : shipping === 0 ? (
                      <span className="text-green-700">{shippingMethod === "pickup" ? "Odbiór osobisty" : "Gratis"}</span>
                    ) : (
                      `${shipping} zł`
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-serif text-xl text-espresso pt-2 border-t border-sand">
                  <span>Razem</span>
                  <span>{total.toFixed(2).replace(".", ",")} zł</span>
                </div>
              </div>
              {!isLoggedIn && (
                <div className="mt-6 border-t border-sand pt-4">
                  <label className="flex items-start gap-3 text-xs text-charcoal/80 leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        if (e.target.checked) {
                          setFieldErrors((prev) => { const n = { ...prev }; delete n.terms; return n; });
                        }
                      }}
                      className="mt-0.5 accent-clay shrink-0"
                    />
                    <span>
                      Akceptuję{" "}
                      <Link href="/regulamin" target="_blank" className="text-clay hover:text-espresso underline">regulamin</Link>
                      {" "}i{" "}
                      <Link href="/polityka-prywatnosci" target="_blank" className="text-clay hover:text-espresso underline">politykę prywatności</Link>
                      . *
                    </span>
                  </label>
                  <FieldError msg={fieldErrors.terms} />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || addressBlocked}
                className="w-full mt-6 bg-clay hover:bg-terracotta hover:text-espresso disabled:bg-sand disabled:text-charcoal/40 disabled:cursor-not-allowed text-warm-white text-xs tracking-widest uppercase py-4 transition-colors"
              >
                {loading ? "Proszę czekać..." : form.paymentMethod === "stripe" ? "Przejdź do płatności" : "Złóż zamówienie"}
              </button>
              {addressBlocked && (
                <p className="mt-2 text-xs text-amber-700 text-center">
                  Uzupełnij{" "}
                  <Link href="/konto/adres" className="underline font-medium">
                    adres dostawy w koncie
                  </Link>{" "}
                  aby odblokować zamówienie.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
