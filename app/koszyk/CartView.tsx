"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart";
import ClayRule from "@/components/ui/ClayRule";
import { bundleSummary, type BundleConfig } from "@/lib/bundled-shipping";

export type ShippingSettings = {
  cost: number;
  freeEnabled: boolean;
  freeFrom: number;
  /** Promocja „Wielosztuki” – rabat proporcjonalny na wszystkie pozycje koszyka. */
  bundle: BundleConfig;
};

/**
 * Widok koszyka. Ustawienia wysyłki przychodzą **propsem z serwera**, a nie
 * fetchem po zamontowaniu: pobierane w przeglądarce sprawiały, że przez chwilę
 * po wejściu widać było ceny policzone starą stawką, które po sekundzie
 * podskakiwały. Zawartość koszyka (localStorage) zostaje kliencka.
 */
export default function CartView({ shipping }: { shipping: ShippingSettings }) {
  const { items, removeItem, updateQuantity, subtotal } = useCart();

  // W promocji „Wielosztuki” próg darmowej wysyłki nie działa – wysyłka jest
  // doliczona raz, a nadwyżka wraca jako rabat o tym samym procencie na każdej pozycji
  const bundle = shipping.bundle;
  const summary = bundleSummary(items, bundle);
  // Koszyk **nigdy** nie pokazuje kwoty dostawy ani nie dolicza jej do sumy –
  // koszt zależy od metody, którą klient wybiera dopiero przy zamówieniu.
  // W promocji „Wielosztuki” narzut siedzi już w cenach katalogowych, więc suma
  // koszyka jest tam kwotą końcową.
  const total = bundle.enabled ? summary.total : subtotal;
  /** Ceny pozycji po uwzględnieniu promocji – klucz to id produktu. */
  const lineFor = new Map(summary.lines.map((l) => [l.item.id, l]));
  // Upust obejmuje rabat produktowy i rabat za wielosztuki – pokazujemy go
  // także wtedy, gdy promocja „Wielosztuki” jest wyłączona, a produkt przeceniony
  const hasDiscount = summary.discountTotal > 0;

  if (items.length === 0) {
    return (
      <div className="min-h-[100svh] bg-warm-white">
        <div className="bg-cream pt-32 pb-12 px-6 text-center">
          <h1 className="font-serif text-5xl text-espresso">Koszyk</h1>
          <ClayRule align="center" className="max-w-[220px] mx-auto mt-6" />
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
    <div className="min-h-[100svh] bg-warm-white">
      <div className="bg-cream pt-32 pb-12 px-6 text-center">
        <h1 className="font-serif text-5xl text-espresso">Koszyk</h1>
        <p className="text-charcoal/80 mt-2 text-sm">{items.length} {items.length === 1 ? "produkt" : "produkty"}</p>
        <ClayRule align="center" className="max-w-[220px] mx-auto mt-6" />
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Lista */}
        <div className="lg:col-span-2 space-y-6">
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
                  {(hasDiscount ? summary.catalogTotal : subtotal).toFixed(2).replace(".", ",")} zł
                </span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Rabat {summary.discountPercent > 0 && `−${summary.discountPercent}%`}</span>
                  <span>−{summary.discountTotal.toFixed(2).replace(".", ",")} zł</span>
                </div>
              )}
              {/* Warunek promocji podany wprost – klient musi wiedzieć, kiedy
                  rabat przysługuje i czego dotyczy */}
              {bundle.enabled && (
                <p className="text-xs text-charcoal/80">
                  Rabat za wielosztuki naliczamy przy zakupie od 2 sztuk – obejmuje
                  wszystkie produkty w zamówieniu.
                </p>
              )}
              <div className="flex justify-between text-sm text-charcoal/80">
                <span>Wysyłka</span>
                <span>
                  {bundle.enabled ? (
                    <span className="text-green-700">Darmowa wysyłka</span>
                  ) : (
                    "przy wyborze dostawy"
                  )}
                </span>
              </div>
              {!bundle.enabled && shipping.freeEnabled && subtotal < shipping.freeFrom && (
                <p className="text-xs text-clay">
                  Dodaj jeszcze {(shipping.freeFrom - subtotal).toFixed(2).replace(".", ",")} zł do darmowej wysyłki
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
          </div>
        </div>
      </div>
    </div>
  );
}
