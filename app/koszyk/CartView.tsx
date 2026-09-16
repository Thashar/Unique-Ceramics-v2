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
        {/* Pusty koszyk jako karta-kafelek – ta sama konwencja co `AuthShell`
            i dymki w nagłówku: zaokrąglone rogi, pas szkliwa u góry, ikona
            w kółku, miękkie plamy terakoty i gliny w tle. Bez pasa z nagłówkiem
            strony (decyzja właściciela 16.09.2026) – karta ma własny tytuł,
            a `h1` zostaje w niej dla struktury dokumentu */}
        <div className="relative overflow-hidden px-6 py-20 md:py-28">
          <div aria-hidden="true" className="hidden md:block pointer-events-none absolute -top-24 -left-20 w-[26rem] h-[26rem] rounded-full bg-terracotta/15 blur-3xl" />
          <div aria-hidden="true" className="hidden md:block pointer-events-none absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-clay/10 blur-3xl" />

          <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-sand bg-warm-white shadow-[0_22px_48px_-18px_rgba(44,40,37,0.35),0_4px_14px_-6px_rgba(44,40,37,0.18)]">
            <div aria-hidden="true" className="h-1 bg-gradient-to-r from-terracotta via-clay to-sand" />
            <div className="px-8 py-10 text-center">
              <span className="mx-auto mb-6 w-16 h-16 rounded-full bg-cream border border-sand flex items-center justify-center">
                <ShoppingBag size={26} strokeWidth={1.3} className="text-clay" />
              </span>
              <ClayRule align="center" className="max-w-[200px] mx-auto mb-5" />
              <h1 className="font-serif text-2xl md:text-3xl text-espresso mb-3">Koszyk jest pusty</h1>
              <p className="text-sm text-charcoal/80 leading-relaxed mb-8">
                Każda rzecz w sklepie powstaje ręcznie i jest jedyna w swoim rodzaju –
                zobacz, co teraz czeka w pracowni.
              </p>
              <Link
                href="/sklep"
                className="inline-flex w-full items-center justify-center gap-3 rounded-md bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-8 py-4 transition-colors"
              >
                Przejdź do sklepu
                <ArrowRight size={15} strokeWidth={1.5} />
              </Link>
              <p className="text-xs text-charcoal/80 mt-5">
                Masz własny pomysł?{" "}
                <Link href="/zamowienie-indywidualne" className="text-clay hover:text-espresso underline underline-offset-2 transition-colors">
                  Zamów indywidualnie
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-warm-white">
      {/* Koszyk z produktami w tej samej karcie-kafelku co pusty (decyzja
          właściciela 16.09.2026): pas szkliwa, tytuł z `ClayRule` w karcie,
          lista po lewej i podsumowanie na kremowym panelu po prawej. Bez
          osobnego pasa z nagłówkiem strony */}
      {/* `overflow-clip`, nie `hidden`: hidden robi z sekcji kontener przewijania
          i psuje `sticky` podsumowania */}
      <div className="relative md:overflow-clip px-6 lg:px-10 py-10 md:py-16">
        <div aria-hidden="true" className="hidden md:block pointer-events-none absolute -top-24 -left-20 w-[26rem] h-[26rem] rounded-full bg-terracotta/15 blur-3xl" />
        <div aria-hidden="true" className="hidden md:block pointer-events-none absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-clay/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl md:overflow-clip md:rounded-2xl md:border md:border-sand md:bg-warm-white md:shadow-[0_22px_48px_-18px_rgba(44,40,37,0.35),0_4px_14px_-6px_rgba(44,40,37,0.18)]">
          <div aria-hidden="true" className="hidden md:block h-1 bg-gradient-to-r from-terracotta via-clay to-sand" />

          <div className="md:px-10 md:pt-10 pb-6 border-b border-sand flex flex-wrap items-end justify-between gap-4">
            <div>
              <ClayRule className="mb-4" />
              <h1 className="font-serif text-3xl md:text-4xl text-espresso">Koszyk</h1>
            </div>
            <p className="text-xs tracking-widest uppercase text-charcoal/80 pb-1">
              {items.length} {items.length === 1 ? "produkt" : items.length < 5 ? "produkty" : "produktów"}
            </p>
          </div>

      <div className="md:px-10 py-8 md:py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Lista */}
        <div className="lg:col-span-2 space-y-6">
          {priceChanged && (
            <p className="rounded-md bg-mist border border-sand text-charcoal/80 text-sm px-4 py-3">
              Ceny części produktów zmieniły się od czasu dodania ich do koszyka –
              podsumowanie jest już zaktualizowane.
            </p>
          )}
          {/* Na telefonie nazwa ma dwie linie zamiast wielokropka, a cena pozycji
              schodzi do wiersza z licznikiem – osobna kolumna po prawej zostawiała
              nazwie za mało miejsca i ucinała ją po kilku znakach */}
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 sm:gap-5 pb-6 border-b border-sand last:border-b-0 last:pb-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-cream flex-shrink-0 overflow-hidden rounded-lg">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag size={24} strokeWidth={1} className="text-sand" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/sklep/${item.slug}`} className="font-serif text-sm sm:text-lg leading-tight sm:leading-snug text-espresso hover:text-clay transition-colors block line-clamp-2">
                  {item.name}
                </Link>
                <p className="text-xs sm:text-sm text-charcoal/80 mt-0.5 sm:mt-1">
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
                <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-3">
                  <div className="flex items-center rounded-md border border-sand">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-charcoal hover:text-clay transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 sm:w-8 text-center text-xs sm:text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-charcoal hover:text-clay disabled:text-sand disabled:cursor-not-allowed transition-colors"
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
                    <span className="hidden sm:inline text-xs text-clay">maks. dostępna ilość</span>
                  )}
                  {/* Cena pozycji – na telefonie tutaj, na szerszym ekranie w kolumnie obok */}
                  <p className="sm:hidden ml-auto font-serif text-sm text-espresso tabular-nums whitespace-nowrap">
                    {(lineFor.get(item.id)?.lineTotal ?? item.price * item.quantity)
                      .toFixed(2)
                      .replace(".", ",")} zł
                  </p>
                </div>
                {item.quantity >= item.stock && (
                  <p className="sm:hidden text-xs text-clay mt-1.5">maks. dostępna ilość</p>
                )}
              </div>
              <div className="hidden sm:block text-right flex-shrink-0">
                <p className="font-serif text-lg text-espresso tabular-nums whitespace-nowrap">
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
          <div className="rounded-xl bg-cream border border-sand p-6 md:p-8 lg:sticky lg:top-28">
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
              className="w-full flex items-center justify-center gap-3 rounded-md bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-sm tracking-widest uppercase py-4 transition-colors"
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
      </div>
    </div>
  );
}
