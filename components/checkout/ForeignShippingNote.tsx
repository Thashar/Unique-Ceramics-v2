import Link from "next/link";
import { Globe } from "lucide-react";

/**
 * Informacja o wysyłce poza Polskę.
 *
 * Sklep obsługuje dostawę krajową (stawki, paczkomaty i progi darmowej wysyłki
 * są policzone dla Polski), więc zamówienia zagraniczne przyjmujemy przez
 * wycenę indywidualną. Bez tej informacji klient z zagranicy dochodził do
 * wyboru dostawy, nie znajdował swojego kraju i po prostu wychodził.
 *
 * `prominent` włącza wariant dwujęzyczny – pokazujemy go, gdy adres IP wskazuje
 * na zagranicę (`lib/visitor-country.ts`). To **wyłącznie podpowiedź**: VPN,
 * wakacje albo Polak mieszkający za granicą dają fałszywy odczyt w obie strony,
 * więc wariant zagraniczny niczego nie blokuje ani nie zmienia w cenach –
 * dokłada tylko drugie zdanie po angielsku.
 *
 * Komponent jest czysto prezentacyjny (bez `use client` i bez API serwera),
 * więc można go renderować i po stronie serwera, i wewnątrz komponentów
 * klienckich (`CheckoutForm`, `CartView`).
 */
export default function ForeignShippingNote({
  prominent = false,
  className = "",
}: {
  /** Wariant dwujęzyczny dla odwiedzających spoza Polski. */
  prominent?: boolean;
  className?: string;
}) {
  if (!prominent) {
    return (
      <p className={`text-xs text-charcoal/80 ${className}`}>
        Sklep prowadzi wysyłkę na terenie Polski. Zamówienia z zagranicy realizuję po
        indywidualnej wycenie –{" "}
        <Link
          href="/zamowienie-indywidualne"
          className="text-clay underline hover:text-espresso transition-colors"
        >
          napisz do mnie
        </Link>
        .
      </p>
    );
  }

  return (
    <div className={`border border-clay/40 bg-cream p-4 flex gap-3 ${className}`}>
      <Globe size={18} strokeWidth={1.5} className="text-clay shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-sm text-charcoal/80 space-y-2">
        <p>
          <strong className="text-espresso">Zamawiasz spoza Polski?</strong> Dostawa w sklepie
          obejmuje Polskę, ale wysyłam też za granicę – po indywidualnej wycenie.
        </p>
        <p lang="en">
          <strong className="text-espresso">Ordering from outside Poland?</strong> Checkout covers
          Polish delivery only, but I do ship abroad – just ask for a quote.
        </p>
        <Link
          href="/zamowienie-indywidualne"
          className="inline-block text-clay underline hover:text-espresso transition-colors"
        >
          Poproś o wycenę / Ask for a quote
        </Link>
      </div>
    </div>
  );
}
