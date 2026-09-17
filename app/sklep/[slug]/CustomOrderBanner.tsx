import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n";
import { t } from "@/lib/dictionary";

/**
 * Baner na karcie produktu w wersji angielskiej – **zamiast** przycisku
 * koszyka, informacji o wysyłce i promocji. Sklep prowadzi sprzedaż tylko
 * w Polsce, więc obcojęzyczny klient może ten przedmiot wyłącznie zamówić
 * indywidualnie (decyzja właściciela 17.09.2026). Przycisk prowadzi do
 * formularza zamówienia indywidualnego z linkiem do produktu w treści
 * (`?produkt={slug}` czyta `CustomOrderForm`).
 *
 * Ten sam materiał co pas zamówień indywidualnych w katalogu: tło `espresso`,
 * ikona w kółku, przycisk w ramce z terakoty.
 */
export default function CustomOrderBanner({ slug, locale }: { slug: string; locale: Locale }) {
  const d = t(locale);
  return (
    <div className="mt-2 flex flex-col gap-5 bg-espresso p-6 sm:p-7 rounded-2xl">
      <div className="flex items-start gap-4">
        <span
          className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-terracotta/40 bg-terracotta/10 text-terracotta shrink-0"
          aria-hidden="true"
        >
          <Gift strokeWidth={1.5} className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-xl text-cream mb-2 leading-snug">{d.product.orderTitle}</h2>
          <p className="text-sand/90 text-sm leading-relaxed">{d.product.orderText}</p>
        </div>
      </div>
      <Link
        href={`${localePath(locale, "/zamowienie-indywidualne")}?produkt=${encodeURIComponent(slug)}`}
        className="group inline-flex items-center justify-center gap-3 w-full border border-terracotta/50 hover:border-terracotta hover:bg-terracotta hover:text-espresso text-cream text-xs tracking-widest uppercase px-6 py-4 transition-all duration-300 rounded-md"
      >
        {d.product.orderCta}
        <ArrowRight size={14} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
      </Link>
    </div>
  );
}
