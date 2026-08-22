export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Potwierdzenie zamówienia",
  description: "Dziękujemy za złożenie zamówienia w Unique Ceramics.",
  robots: { index: false, follow: false },
};
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { BUNDLED_SHIPPING_KEY, bundleFromSettings, bundleSummary } from "@/lib/bundled-shipping";
import { auth } from "@/auth";
import StripeResumeButton from "@/components/account/StripeResumeButton";

// Webhook Stripe z potwierdzeniem płatności potrafi dotrzeć chwilę po powrocie
// na tę stronę – przez pierwsze minuty nie traktujemy zamówienia jako nieopłaconego.
// Odczyt zegara jest tu celowy (strona jest force-dynamic) i trzymany poza
// komponentem, żeby render pozostał czysty.
const WEBHOOK_GRACE_MS = 5 * 60_000;

function olderThanWebhookGrace(createdAt: Date): boolean {
  return Date.now() - new Date(createdAt).getTime() > WEBHOOK_GRACE_MS;
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; platnosc?: string }>;
}) {
  const { id, platnosc } = await searchParams;
  const session = await auth();

  let order = null;
  let bankSettings: Record<string, string> = {};

  if (id) {
    try {
      const found = await db.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (found) {
        // Zamówienia zalogowanych użytkowników – weryfikuj własność
        if (found.userId) {
          if (session?.user?.id === found.userId) order = found;
        } else {
          // Zamówienie gościa – URL jest tokenem dostępu
          order = found;
        }
      }
    } catch {
      // DB not available – show generic confirmation
    }
  }

  if (order?.paymentMethod === "transfer") {
    bankSettings = await getSettings([
      "payment_bank_account_name",
      "payment_bank_account_number",
      "payment_bank_name",
      "payment_bank_transfer_title",
      "payment_blik_enabled",
      "payment_blik_phone",
    ]);
  }

  // Promocja „Wielosztuki”: w koszyku klient widział ceny katalogowe z rabatem
  // i „Darmową wysyłkę”. Zamówienie trzyma ceny bazowe i osobno koszt wysyłki
  // (kwoty serwerowe promocja zostawia w spokoju), więc rozbicie odtwarzamy tu
  // ponownie – inaczej podsumowanie zaprzeczałoby temu, co obiecywał koszyk.
  let bundleLines: ReturnType<typeof bundleSummary<{ id: string; quantity: number; price: number }>> | null = null;
  if (order && order.shippingCost > 0) {
    const bundle = bundleFromSettings(
      await getSettings([BUNDLED_SHIPPING_KEY, "shipping_cost", "shipping_cost_parcel_locker"])
    );
    if (bundle.enabled) {
      bundleLines = bundleSummary(
        order.items.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price })),
        { enabled: true, surcharge: order.shippingCost }
      );
    }
  }

  const orderNumber = id ? id.slice(-8).toUpperCase() : "";
  const transferTitle = `${bankSettings.payment_bank_transfer_title || "Zamówienie"} #${orderNumber}`;

  // Zamówienie gościa – brak konta, do którego można by odesłać
  const isGuestOrder = !!order && !order.userId;
  const cancelled = order?.status === "CANCELLED";
  // Płatność kartą porzucona (powrót ze Stripe przez cancel_url) albo wejście
  // z linku w e-mailu do wciąż nieopłaconego zamówienia – można ją ponowić
  const olderThanGrace = order ? olderThanWebhookGrace(order.createdAt) : false;
  const awaitingStripe =
    order?.paymentMethod === "stripe" &&
    order.paymentStatus !== "PAID" &&
    !cancelled &&
    (platnosc === "anulowana" || olderThanGrace);

  const Icon = cancelled ? XCircle : awaitingStripe ? Clock : CheckCircle;
  const iconColor = cancelled ? "text-red-700" : awaitingStripe ? "text-clay" : "text-green-700";
  const heading = cancelled
    ? "Zamówienie zostało anulowane"
    : awaitingStripe
      ? "Zamówienie oczekuje na płatność"
      : "Dziękuję za zamówienie!";

  return (
    <div className="min-h-[100svh] bg-warm-white flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <Icon
            size={64}
            strokeWidth={1}
            className={`mx-auto ${iconColor} mb-8`}
          />
          <h1 className="font-serif text-4xl text-espresso mb-4">
            {heading}
          </h1>
          {orderNumber && (
            <p className="text-xs text-charcoal/80 mb-2">
              Nr zamówienia:{" "}
              <span className="font-mono text-charcoal/80">{orderNumber}</span>
            </p>
          )}
        </div>

        {/* Zamówienie anulowane – np. wygasła sesja płatności */}
        {cancelled && (
          <div className="bg-cream border-l-4 border-red-700 p-6 mb-8">
            <p className="text-sm text-charcoal/80 leading-relaxed">
              To zamówienie zostało anulowane, a zarezerwowane produkty wróciły do sprzedaży.
              Jeśli nadal chcesz je kupić, złóż zamówienie ponownie w sklepie.
            </p>
          </div>
        )}

        {/* Bank transfer + BLIK details */}
        {order?.paymentMethod === "transfer" && !cancelled && (
          <div className="bg-cream border-l-4 border-terracotta p-6 mb-8">
            <p className="text-xs tracking-widest uppercase text-clay mb-4">
              Dane do płatności
            </p>
            <div className="space-y-2 text-sm text-charcoal/80">
              {bankSettings.payment_bank_account_name && (
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/80 shrink-0">Odbiorca</span>
                  <span className="font-medium text-espresso text-right">
                    {bankSettings.payment_bank_account_name}
                  </span>
                </div>
              )}
              {bankSettings.payment_bank_account_number && (
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/80 shrink-0">Numer konta</span>
                  <span className="font-mono text-espresso text-right break-all">
                    {bankSettings.payment_bank_account_number}
                  </span>
                </div>
              )}
              {bankSettings.payment_bank_name && (
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/80 shrink-0">Bank</span>
                  <span className="text-espresso text-right">
                    {bankSettings.payment_bank_name}
                  </span>
                </div>
              )}
              {bankSettings.payment_blik_enabled === "true" && bankSettings.payment_blik_phone && (
                <div className="flex justify-between gap-4 border-t border-sand pt-2 mt-2">
                  <span className="text-charcoal/80 shrink-0">BLIK na telefon</span>
                  <span className="font-mono text-espresso text-right">
                    {bankSettings.payment_blik_phone}
                  </span>
                </div>
              )}
              {order && (
                <div className="flex justify-between gap-4 border-t border-sand pt-2 mt-2">
                  <span className="text-charcoal/80 shrink-0">Kwota</span>
                  <span className="font-serif text-lg text-espresso">
                    {order.total.toFixed(2).replace(".", ",")} zł
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-charcoal/80 shrink-0">Tytuł przelewu</span>
                <span className="text-espresso text-right">{transferTitle}</span>
              </div>
            </div>
            <p className="text-xs text-charcoal/80 mt-4 leading-relaxed">
              Płatność zrealizuj w ciągu <strong>48 godzin</strong> – po tym czasie zamówienie zostanie automatycznie anulowane. Dane zostały też wysłane na Twój adres e-mail.
            </p>
          </div>
        )}

        {/* Stripe – płatność zrealizowana */}
        {order?.paymentMethod === "stripe" && !awaitingStripe && !cancelled && (
          <div className="bg-cream border-l-4 border-terracotta p-6 mb-8">
            <p className="text-xs tracking-widest uppercase text-clay mb-3">
              Płatność kartą
            </p>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              Płatność kartą została zrealizowana. Potwierdzenie otrzymasz na podany adres e-mail.
            </p>
          </div>
        )}

        {/* Stripe – płatność porzucona lub jeszcze niezaksięgowana */}
        {awaitingStripe && order && (
          <div className="bg-cream border-l-4 border-terracotta p-6 mb-8">
            <p className="text-xs tracking-widest uppercase text-clay mb-3">
              Płatność kartą
            </p>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              Zamówienie zostało zapisane, ale płatność nie została jeszcze zaksięgowana.
              Produkty są zarezerwowane przez <strong>24 godziny</strong> – po tym czasie
              zamówienie zostanie anulowane, a produkty wrócą do sprzedaży.
            </p>
            <StripeResumeButton orderId={order.id} />
          </div>
        )}

        {/* Order summary */}
        {order && (
          <div className="bg-cream p-6 mb-8">
            <p className="text-xs tracking-widest uppercase text-charcoal/80 mb-4">
              Podsumowanie
            </p>
            <div className="space-y-2 text-sm">
              {order.items.map((item) => {
                const line = bundleLines?.lines.find((l) => l.item.id === item.id);
                return (
                  <div key={item.id} className="flex justify-between text-charcoal/80">
                    <span>
                      {item.name} ×{item.quantity}
                    </span>
                    <span>
                      {((line?.lineTotal ?? item.price * item.quantity))
                        .toFixed(2)
                        .replace(".", ",")} zł
                    </span>
                  </div>
                );
              })}
              {bundleLines && bundleLines.discountTotal > 0 && (
                <>
                  <div className="flex justify-between text-charcoal/80 border-t border-sand pt-2">
                    <span>Produkty przed rabatem</span>
                    <span>{bundleLines.catalogTotal.toFixed(2).replace(".", ",")} zł</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Rabat {bundleLines.discountPercent > 0 && `−${bundleLines.discountPercent}%`}</span>
                    <span>−{bundleLines.discountTotal.toFixed(2).replace(".", ",")} zł</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-charcoal/80 border-t border-sand pt-2">
                <span>Wysyłka</span>
                <span>
                  {bundleLines ? (
                    <span className="text-green-700">
                      {order.shippingMethod === "pickup" ? "Odbiór osobisty" : "Darmowa wysyłka"}
                    </span>
                  ) : order.shippingCost === 0 ? (
                    "Gratis"
                  ) : (
                    `${order.shippingCost.toFixed(2).replace(".", ",")} zł`
                  )}
                </span>
              </div>
              <div className="flex justify-between font-serif text-xl text-espresso border-t border-sand pt-2">
                <span>Razem</span>
                <span>{order.total.toFixed(2).replace(".", ",")} zł</span>
              </div>
            </div>
          </div>
        )}

        {/* Zamówienie bez konta – link do tej strony jest jedynym dostępem */}
        {order && isGuestOrder && !cancelled && (
          <div className="bg-mist border border-sand p-6 mb-8 text-sm text-charcoal/80 leading-relaxed">
            <p className="text-espresso font-medium mb-2">Zamówienie bez konta</p>
            <p>
              Szczegóły wysłaliśmy na adres <strong className="text-espresso">{order.email}</strong>.
              Zachowaj tę wiadomość – zawiera link do podglądu zamówienia. O statusie realizacji
              informujemy e-mailem. W razie pytań napisz na{" "}
              <a href="mailto:kontakt@uniqueceramics.pl" className="text-clay hover:text-espresso underline">
                kontakt@uniqueceramics.pl
              </a>{" "}
              i podaj numer zamówienia.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sklep"
            className="px-8 py-4 bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase transition-colors text-center"
          >
            Wróć do sklepu
          </Link>
          {isGuestOrder ? (
            <Link
              href="/rejestracja"
              className="px-8 py-4 border border-sand hover:border-clay text-espresso text-xs tracking-widest uppercase transition-colors text-center"
            >
              Załóż konto
            </Link>
          ) : (
            <Link
              href="/konto/zamowienia"
              className="px-8 py-4 border border-sand hover:border-clay text-espresso text-xs tracking-widest uppercase transition-colors text-center"
            >
              Moje zamówienia
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
