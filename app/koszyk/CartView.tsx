"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus } from "lucide-react";
import { useCart, useCartPriceSync } from "@/lib/cart";
import ClayRule from "@/components/ui/ClayRule";
import ForeignShippingNote from "@/components/checkout/ForeignShippingNote";
import { priceOrder } from "@/lib/discount-code";
import { nextTierHintText, type QuantityPromoConfig } from "@/lib/quantity-promo";
import { freeShippingMissing, type FreeShippingConfig } from "@/lib/free-shipping";

export type ShippingSettings = {
  /** Najtańsza stawka wysyłki – koszyk nie zna jeszcze wybranej metody. */
  cheapestCost: number;
  freeShipping: FreeShippingConfig | null;
};

/**
 * Widok koszyka. Ustawienia i promocje przychodzą **propsem z serwera**, a nie
 * fetchem po zamontowaniu: pobierane w przeglądarce sprawiały, że przez chwilę
 * po wejściu widać było ceny policzone starą stawką, które po sekundzie
 * podskakiwały. Zawartość koszyka (localStorage) zostaje kliencka.
 */
export default function CartView({
  shipping,
  quantityPromo,
}: {
  shipping: ShippingSettings;
  quantityPromo: QuantityPromoConfig | null;
}) {
  const { items, removeItem, updateQuantity } = useCart();
  // Ceny w koszyku pochodzą z chwili dodania produktu – po wejściu wyrównujemy
  // je do stanu z serwera, żeby klient nie oglądał wygasłej promocji
  const { priceChanged } = useCartPriceSync();

  // Ta sama funkcja, którą liczy `/api/checkout` – koszyk nie ma własnej
  // arytmetyki. Metody dostawy jeszcze nie znamy, więc pytamy o najtańszą
  // (kurier/paczkomat mają tu tę samą stawkę wejściową).
  const pricing = priceOrder({
    items,
    quantityPromo,
    code: null,
    shipping: {
      method: "courier",
      courier: shipping.cheapestCost,
      parcelLocker: shipping.cheapestCost,
      freeShipping: shipping.freeShipping,
    },
  });
  const summary = pricing.display;
  // Koszyk **nie dolicza wysyłki do sumy** – koszt zależy od metody, którą klient
  // wybiera dopiero przy zamówieniu. Pokazujemy samą wartość produktów.
  const total = pricing.itemsTotal;
  /** Ceny pozycji po rabatach – klucz to id produktu. */
  const lineFor = new Map(summary.lines.map((l) => [l.item.id, l]));
  const hasDiscount = summary.discountTotal > 0;
  // Zachęty: do wyższego progu rabatu i do darmowej wysyłki
  const nextTierText = nextTierHintText(pricing.quantityNextTier);
  const freeShippingLeft = freeShippingMissing(
    shipping.freeShipping,
    "courier",
    pricing.itemsTotal
  );

  if (items.length === 0) {
    return (
      <div className="bg-warm-white">
        {/* Ten sam układ nagłówka co na /zamowienie – obie strony należą do
            jednej ścieżki zakupowej, więc nie mogą się różnić wyrównaniem */}
        <div className="bg-cream px-6 lg:px-10 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Sklep</p>
            <h1 className="font-serif text-4xl md:text-5xl text-espresso">Koszyk</h1>
            <ClayRule className="mt-6" />
          </div>
        </div>
        <div className="text-center py-24">
          <ShoppingBag size={56} strokeWidth={1} className="mx-auto text-sand mb-6" />
          <h2 className="font-serif text-2xl text-espresso mb-3">Koszyk jest pusty</h2>
          <p className="text-charcoal/80 mb-10">Nie masz jeszcze nic w koszyku.</p>
          <Link
            href="/sklep"
            className="inline-flex items-center gap-3 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase px-8 py-4 transition-colors"
          >
            Przejdź do sklepu
            <ArrowRight size={15} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-warm-white">
      <div className="bg-cream px-6 lg:px-10 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.3em] uppercase text-clay mb-3">Sklep</p>
          <h1 className="font-serif text-4xl md:text-5xl text-espresso">Koszyk</h1>
          <p className="text-charcoal/80 mt-2 text-sm">
            {items.length} {items.length === 1 ? "produkt" : "produkty"}
          </p>
          <ClayRule className="mt-6" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Lista */}
        <div className="lg:col-span-2 space-y-6">
          {priceChanged && (
            <p className="bg-mist border border-sand text-charcoal/80 text-sm px-4 py-3">
              Ceny części produktów zmieniły się od czasu dodania ich do koszyka –
              podsumowanie jest już zaktualizowane.
            </p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex gap-5 pb-6 border-b border-sand">
              <div className="relative w-24 h-24 bg-cream flex-shrink-0 overflow-hidden">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={24} strokeWidth={1} className="text-sand" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/sklep/${item.slug}`} className="font-serif text-lg text-espresso hover:text-clay transition-colors block truncate">
                  {item.name}
                </Link>
                <p className="text-sm text-charcoal/80 mt-1">
                  {(() => {
                    const line = lineFor.get(item.id);
                    const zl = (v: number) => `${v.toFixed(2).replace(".", ",")} zł`;
                    // Rabat dostaje każda sztuka – także pierwsza
                    if (line && line.discountPercent > 0) {
                      return (
                        <>
                          <span className="line-through decoration-charcoal/40">
                            {zl(line.catalogUnitPrice)}
                          </span>{" "}
                          <span className="text-espresso">{zl(line.unitPrice)}</span>{" "}
                          <span className="text-green-700">−{line.discountPercent}%</span> / szt.
                        </>
                      );
                    }
                    return <>{zl(line?.unitPrice ?? item.price)} / szt.</>;
                  })()}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center border border-sand">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-clay transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-clay disabled:text-sand disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-charcoal/80 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  {item.quantity >= item.stock && (
                    <span className="text-xs text-clay">maks. dostępna ilość</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-serif text-lg text-espresso">
                  {(lineFor.get(item.id)?.lineTotal ?? item.price * item.quantity)
                    .toFixed(2)
                    .replace(".", ",")} zł
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Podsumowanie */}
        <div className="lg:col-span-1">
          <div className="bg-cream p-8 sticky top-28">
            <h2 className="font-serif text-2xl text-espresso mb-6">Podsumowanie</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-charcoal/80">
                <span>{hasDiscount ? "Produkty przed rabatem" : "Produkty"}</span>
                <span>
                  {(hasDiscount ? summary.catalogTotal : pricing.itemsTotal)
                    .toFixed(2)
                    .replace(".", ",")} zł
                </span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Rabat {summary.discountPercent > 0 && `−${summary.discountPercent}%`}</span>
                  <span>−{summary.discountTotal.toFixed(2).replace(".", ",")} zł</span>
                </div>
              )}
              {/* Rabat ilościowy jako dopisek – wiersz „Rabat” już go obejmuje,
                  osobne odjęcie zaniżałoby kolumnę o jego wartość */}
              {pricing.quantityPercent > 0 && pricing.quantityDiscount > 0 && (
                <p className="text-xs text-green-700">
                  w tym rabat ilościowy (−{pricing.quantityPercent}%):
                  {" "}−{pricing.quantityDiscount.toFixed(2).replace(".", ",")} zł
                </p>
              )}
              {/* Zachęta do wyższego progu – warunek podany wprost, żeby klient
                  wiedział, ile dołożyć i co dokładnie dostanie */}
              {nextTierText && <p className="text-xs text-clay">{nextTierText}</p>}
              <div className="flex justify-between text-sm text-charcoal/80">
                <span>Wysyłka</span>
                <span>
                  {pricing.shippingCost === 0 && shipping.freeShipping ? (
                    <span className="text-green-700">Darmowa wysyłka</span>
                  ) : (
                    "przy wyborze dostawy"
                  )}
                </span>
              </div>
              {freeShippingLeft > 0 && (
                <p className="text-xs text-clay">
                  Dodaj jeszcze {freeShippingLeft.toFixed(2).replace(".", ",")} zł do darmowej wysyłki
                </p>
              )}
              <div className="border-t border-sand pt-3 flex justify-between font-serif text-xl text-espresso">
                <span>Razem</span>
                <span>{total.toFixed(2).replace(".", ",")} zł</span>
              </div>
            </div>
            <Link
              href="/zamowienie"
              className="w-full flex items-center justify-center gap-3 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase py-4 transition-colors"
            >
              Zamów
              <ArrowRight size={15} strokeWidth={1.5} />
            </Link>
            <Link
              href="/sklep"
              className="block text-center text-xs tracking-widest uppercase text-charcoal/80 hover:text-clay transition-colors mt-4"
            >
              ← Kontynuuj zakupy
            </Link>
            {/* Strona koszyka jest cachowana (ISR), więc bez podpowiedzi z adresu
                IP – wariant dwujęzyczny pokazuje dopiero formularz zamówienia */}
            <ForeignShippingNote className="mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
