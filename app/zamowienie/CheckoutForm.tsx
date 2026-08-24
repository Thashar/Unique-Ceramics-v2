"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, Package, MapPin, Tag, X, Loader2 } from "lucide-react";
import {
  pushCartNotice,
  refreshCartFromServer,
  useCart,
  useCartPriceSync,
} from "@/lib/cart";
import {
  normalizeCode,
  priceOrder,
  type DiscountCodeInfo,
} from "@/lib/discount-code";
import { nextTierHintText, type QuantityPromoConfig } from "@/lib/quantity-promo";
import { freeShippingMissing, type FreeShippingConfig } from "@/lib/free-shipping";
import { validateAddress, validateContact } from "@/lib/address-validation";
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
  /** Rabat ilościowy obowiązujący teraz (null = brak). */
  quantityPromo: QuantityPromoConfig | null;
  /** Promocja „Darmowa wysyłka” obowiązująca teraz (null = brak). */
  freeShipping: FreeShippingConfig | null;
  isLoggedIn: boolean;
  userEmail: string;
  savedAddress: SavedAddress | null;
  paymentMethods: PaymentMethod[];
  shippingCostCourier: number;
  shippingCostParcelLocker: number;
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
  quantityPromo,
  freeShipping,
  isLoggedIn,
  userEmail,
  savedAddress,
  paymentMethods,
  shippingCostCourier,
  shippingCostParcelLocker,
  inpostToken,
  savedAddressComplete,
}: Props) {
  const router = useRouter();
  const { items, clearCart, syncPrices } = useCart();
  // Wyrównanie cen do stanu z serwera zaraz po wejściu – bez tego formularz
  // pokazywałby kwotę z chwili dodania produktu do koszyka
  const { priceChanged, availabilityChanged } = useCartPriceSync();

  // Zmiana zawartości koszyka (wyprzedany produkt, przycięta ilość) odsyła do
  // koszyka. Zostawienie klienta na formularzu kończyło się tym, że składał
  // zamówienie bez brakującego produktu, nie zauważywszy, że coś zniknęło.
  useEffect(() => {
    if (availabilityChanged) router.push("/koszyk");
  }, [availabilityChanged, router]);

  const [shippingMethod, setShippingMethod] = useState<"courier" | "parcel_locker" | "pickup">("courier");
  const [parcelLockerCode, setParcelLockerCode] = useState("");

  // Kod rabatowy: procent i zasady dostajemy z serwera (`/api/discount-code`),
  // kwoty liczy `priceOrder` – ta sama funkcja, której użyje `/api/checkout`
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<DiscountCodeInfo | null>(null);
  const [codeError, setCodeError] = useState("");
  const [codeChecking, setCodeChecking] = useState(false);

  // Cała kwota zamówienia w jednym miejscu: przeceny produktów, rabat ilościowy,
  // kod rabatowy i darmowa wysyłka. Ta sama funkcja liczy `/api/checkout`.
  function pricingFor(method: "courier" | "parcel_locker" | "pickup") {
    return priceOrder({
      items,
      quantityPromo,
      code: appliedCode,
      shipping: {
        method,
        courier: shippingCostCourier,
        parcelLocker: shippingCostParcelLocker,
        freeShipping,
      },
    });
  }

  const pricing = pricingFor(shippingMethod);
  const shipping = pricing.shippingCost;
  const total = pricing.total;
  const summary = pricing.display;
  // Kod niełączony wchodzi tylko wtedy, gdy daje niższą kwotę niż promocje sklepu
  const codeIgnored = appliedCode !== null && pricing.appliedCode === null;
  // Zachęty: ile brakuje do wyższego progu rabatu i do darmowej wysyłki
  const nextTierText = nextTierHintText(pricing.quantityNextTier);
  const freeShippingLeft =
    shippingMethod === "pickup" ? 0 : freeShippingMissing(freeShipping, shippingMethod, pricing.itemsTotal);

  async function applyCode(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    const code = normalizeCode(codeInput);
    if (!code) return;
    setCodeChecking(true);
    setCodeError("");
    try {
      const res = await fetch("/api/discount-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.code) {
        setAppliedCode(null);
        setCodeError(data?.error ?? "Kod jest nieprawidłowy lub wygasł");
        return;
      }
      setAppliedCode({
        code: data.code,
        percent: data.percent,
        freeShipping: data.freeShipping === true,
        stackable: data.stackable,
      });
      setCodeInput(data.code);
    } catch {
      setCodeError("Nie udało się sprawdzić kodu. Spróbuj ponownie.");
    } finally {
      setCodeChecking(false);
    }
  }

  function clearCode() {
    setAppliedCode(null);
    setCodeInput("");
    setCodeError("");
  }

  // Zablokuj złożenie zamówienia jeśli zalogowany użytkownik nie ma kompletnego adresu
  // (null = gość – brak blokady; false = niekompletny; true = OK)
  // Adres jest potrzebny **tylko przy kurierze**: paczkomat ma kod (przesyłka
  // idzie do maszyny, nie pod adres), a odbiór osobisty adres pracowni
  const addressRequired = shippingMethod === "courier";
  const addressBlocked = savedAddressComplete === false && addressRequired;

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

  /** Adres zapisywany w zamówieniu – bez kuriera pola adresowe nie istnieją. */
  function deliveryAddress(): { street: string; postcode: string; city: string } {
    if (shippingMethod === "pickup") {
      return { street: "Odbiór osobisty", postcode: "", city: "Kleszczów" };
    }
    if (shippingMethod === "parcel_locker") {
      return { street: `Paczkomat ${parcelLockerCode.trim()}`, postcode: "", city: "" };
    }
    return { street: form.street, postcode: form.postcode, city: form.city };
  }

  function validateForm(): boolean {
    // Bez adresu sprawdzamy tylko dane kontaktowe – inaczej walidacja żądałaby
    // numeru budynku w polu, którego formularz w ogóle nie pokazuje
    const result = addressRequired
      ? validateAddress({
          firstName: form.firstName,
          lastName:  form.lastName,
          phone:     form.phone,
          street:    form.street,
          postcode:  form.postcode,
          city:      form.city,
        })
      : validateContact({
          firstName: form.firstName,
          lastName:  form.lastName,
          phone:     form.phone,
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
      <div className="bg-warm-white flex items-center justify-center py-24">
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

    const { street, postcode, city } = deliveryAddress();

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
        subtotal: pricing.itemsTotal,
        shippingCost: shipping,
        total,
        // Serwer i tak sprawdza kod w bazie i liczy kwotę od nowa
        discountCode: appliedCode?.code ?? null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      // Serwer wykrył, że koszyk liczył inną kwotę (wygasła przecena, zmiana ceny
      // w panelu). Zamówienie nie powstało – wyrównujemy koszyk i prosimy
      // o ponowne potwierdzenie już na aktualnych cenach.
      if (res.status === 409 && data.priceChanged && Array.isArray(data.items)) {
        syncPrices(
          data.items.map((i: { productId: string; price: number; basePrice?: number }) => ({
            id: i.productId,
            price: i.price,
            basePrice: i.basePrice,
            // Stan magazynowy zostaje bez zmian – ten błąd dotyczy tylko cen
            stock: items.find((c) => c.id === i.productId)?.stock ?? 0,
          }))
        );
      }
      // Produkt sprzedał się między dodaniem do koszyka a kliknięciem „Zamawiam”.
      // Odświeżamy koszyk (wyprzedana pozycja wypada sama) i **cofamy klienta do
      // koszyka** – zostawienie go na formularzu kończyło się tym, że klikał
      // jeszcze raz i składał zamówienie bez brakującego produktu, nie zauważywszy
      // zmiany. Zmianę koszyka trzeba zobaczyć i potwierdzić świadomie.
      if (res.status === 409 && data.outOfStock) {
        const sync = await refreshCartFromServer(items.map((i) => i.id));
        // Gdy wyrównanie nie miało nic do powiedzenia (np. padła sieć albo stan
        // zdążył wrócić), zgłaszamy komunikat serwera – klient nie może zostać
        // odesłany do koszyka bez wyjaśnienia
        if (!sync || (sync.soldOut.length === 0 && sync.reduced.length === 0)) {
          pushCartNotice(
            data.error ?? "Dostępność produktów w koszyku zmieniła się.",
            "warning"
          );
        }
        router.push("/koszyk");
        return;
      }
      setError(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    clearCart();
    if (data.stripeUrl) {
      // assign() zamiast przypisania do location.href – reguła react-hooks/immutability
      // traktuje przypisanie do obiektu spoza komponentu jako mutację
      window.location.assign(data.stripeUrl);
    } else {
      router.push(`/zamowienie/potwierdzenie?id=${data.orderId}`);
    }
  }

  const inputCls = (field: string) =>
    `w-full bg-cream border ${fieldErrors[field] ? "border-red-400" : "border-sand"} focus:border-clay outline-none px-4 py-3 text-espresso text-sm`;

  return (
    <div className="bg-warm-white">
      <div className="bg-cream px-6 lg:px-10 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Sklep</p>
          <h1 className="font-serif text-4xl md:text-5xl text-espresso">Zamówienie</h1>
          <ClayRule className="mt-6" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {priceChanged && !error && (
              <div className="bg-mist border border-sand text-charcoal/80 text-sm px-4 py-3">
                Ceny części produktów zmieniły się od czasu dodania ich do koszyka –
                podsumowanie obok jest już zaktualizowane.
              </div>
            )}
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
                          // Kwota liczona tą samą funkcją co całe zamówienie –
                          // przy kodzie niełączonym rabat ilościowy może ustąpić
                          // kodowi, co zmienia kwotę, od której liczy się próg
                          // darmowej wysyłki
                          if (value === "pickup") return <span className="text-xs text-green-700 font-medium">Bezpłatne</span>;
                          const forMethod = pricingFor(value);
                          if (forMethod.shippingCost === 0) return <span className="text-xs text-green-700 font-medium">Darmowa wysyłka</span>;
                          return (
                            <span className="text-xs text-charcoal/80">
                              {forMethod.shippingCost.toFixed(2).replace(".", ",")} zł
                            </span>
                          );
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

            {/* Adres dostawy – ukryty przy paczkomacie i odbiorze osobistym */}
            {addressRequired && (
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
                {summary.lines.map(({ item, lineTotal }) => (
                  <div key={item.id} className="flex justify-between gap-2 text-charcoal/80">
                    {/* Długie nazwy zawijamy zamiast ucinać – klient musi widzieć, co zamawia */}
                    <span className="min-w-0 break-words">{item.name} × {item.quantity}</span>
                    <span className="shrink-0">{lineTotal.toFixed(2).replace(".", ",")} zł</span>
                  </div>
                ))}
                {summary.discountTotal > 0 && (
                  <>
                    <div className="flex justify-between gap-2 text-charcoal/80">
                      <span>Produkty przed rabatem</span>
                      <span className="shrink-0">
                        {summary.catalogTotal.toFixed(2).replace(".", ",")} zł
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 text-green-700">
                      <span>Rabat {summary.discountPercent > 0 && `−${summary.discountPercent}%`}</span>
                      <span className="shrink-0">
                        −{summary.discountTotal.toFixed(2).replace(".", ",")} zł
                      </span>
                    </div>
                    {/* Składniki rabatu – wiersz „Rabat” obejmuje wszystko, więc
                        pokazujemy je dopiskami, a nie kolejnymi odjęciami */}
                    {pricing.quantityPercent > 0 && pricing.quantityDiscount > 0 && (
                      <p className="text-xs text-green-700">
                        w tym rabat ilościowy (−{pricing.quantityPercent}%):
                        {" "}−{pricing.quantityDiscount.toFixed(2).replace(".", ",")} zł
                      </p>
                    )}
                    {pricing.appliedCode && pricing.codeDiscount > 0 && (
                      <p className="text-xs text-green-700">
                        w tym kod {pricing.appliedCode.code} (−{pricing.appliedCode.percent}%):
                        {" "}−{pricing.codeDiscount.toFixed(2).replace(".", ",")} zł
                      </p>
                    )}
                    {/* Kod na samą wysyłkę nie obniża cen pozycji – jego efekt
                        widać w wierszu wysyłki, więc tu tylko go nazywamy */}
                    {pricing.appliedCode?.freeShipping && pricing.codeDiscount === 0 && (
                      <p className="text-xs text-green-700">
                        kod {pricing.appliedCode.code}: darmowa wysyłka
                      </p>
                    )}
                  </>
                )}

                {/* Zachęty do wyższego progu i do darmowej wysyłki – tuż przy
                    kwotach, bo tu klient decyduje o dołożeniu czegoś do koszyka */}
                {nextTierText && (
                  <p className="text-xs text-clay">{nextTierText}</p>
                )}
                {freeShippingLeft > 0 && (
                  <p className="text-xs text-clay">
                    Dodaj jeszcze {freeShippingLeft.toFixed(2).replace(".", ",")} zł
                    {" "}do darmowej wysyłki
                  </p>
                )}

                {/* Kod rabatowy */}
                <div className="pt-3 border-t border-sand">
                  {appliedCode ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-espresso">
                        <Tag size={14} strokeWidth={1.5} className="text-clay shrink-0" />
                        <span className="font-medium">{appliedCode.code}</span>
                        <span className="text-charcoal/80">
                          {appliedCode.percent > 0 && `−${appliedCode.percent}%`}
                          {appliedCode.percent > 0 && appliedCode.freeShipping && " + "}
                          {appliedCode.freeShipping && "darmowa wysyłka"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={clearCode}
                        className="inline-flex items-center gap-1 text-xs text-charcoal/80 hover:text-red-700 transition-colors"
                      >
                        <X size={13} strokeWidth={1.5} />
                        Usuń
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={codeInput}
                        onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") applyCode(e); }}
                        placeholder="Kod rabatowy"
                        aria-label="Kod rabatowy"
                        className="flex-1 min-w-0 bg-warm-white border border-sand focus:border-clay outline-none px-3 py-2 text-espresso text-sm uppercase tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={applyCode}
                        disabled={codeChecking || !codeInput.trim()}
                        className="shrink-0 inline-flex items-center gap-2 border border-sand bg-warm-white hover:bg-sand disabled:opacity-40 disabled:cursor-not-allowed text-espresso text-xs tracking-widest uppercase px-4 py-2 transition-colors"
                      >
                        {codeChecking && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                        Zastosuj
                      </button>
                    </div>
                  )}
                  {codeError && <p className="mt-2 text-xs text-red-700">{codeError}</p>}
                  {/* Kod niełączony wchodzi tylko wtedy, gdy wychodzi taniej niż
                      promocje sklepu – inaczej zostaje niewykorzystany */}
                  {codeIgnored && (
                    <p className="mt-2 text-xs text-amber-700">
                      Ten kod nie łączy się z innymi rabatami, a promocje sklepu dają
                      niższą cenę – zostawiamy korzystniejszy wariant.
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-sand pt-4 space-y-2 text-sm">
                {/* Przy odbiorze osobistym nie ma żadnej wysyłki – wiersz nazywa się
                    wtedy „Odbiór osobisty”, a nie „Wysyłka: darmowa dostawa” */}
                <div className="flex justify-between text-charcoal/80">
                  <span>{shippingMethod === "pickup" ? "Odbiór osobisty" : "Wysyłka"}</span>
                  <span>
                    {shippingMethod === "pickup" ? (
                      <span className="text-green-700">Bezpłatnie</span>
                    ) : shipping === 0 ? (
                      <span className="text-green-700">Darmowa wysyłka</span>
                    ) : (
                      `${shipping.toFixed(2).replace(".", ",")} zł`
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
              {/* Wyjście z formularza – bez tego jedyną drogą powrotu było menu.
                  Odpowiednik „Kontynuuj zakupy” w koszyku */}
              <Link
                href="/koszyk"
                className="block text-center text-xs tracking-widest uppercase text-charcoal/80 hover:text-clay transition-colors mt-4"
              >
                ← Wróć do koszyka
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
