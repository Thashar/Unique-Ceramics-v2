export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let order = null;
  let bankSettings: Record<string, string> = {};

  if (id) {
    try {
      order = await db.order.findUnique({
        where: { id },
        include: { items: true },
      });
    } catch {
      // DB not available — show generic confirmation
    }
  }

  if (order?.paymentMethod === "transfer") {
    bankSettings = await getSettings([
      "payment_bank_account_name",
      "payment_bank_account_number",
      "payment_bank_name",
      "payment_bank_transfer_title",
      "payment_blik_phone",
    ]);
  }

  const orderNumber = id ? id.slice(-8).toUpperCase() : "";
  const transferTitle = `${bankSettings.payment_bank_transfer_title || "Zamówienie"} #${orderNumber}`;

  return (
    <div className="min-h-[100svh] bg-warm-white flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <CheckCircle
            size={64}
            strokeWidth={1}
            className="mx-auto text-green-500 mb-8"
          />
          <h1 className="font-serif text-4xl text-espresso mb-4">
            Dziękuję za zamówienie!
          </h1>
          {orderNumber && (
            <p className="text-xs text-charcoal/40 mb-2">
              Nr zamówienia:{" "}
              <span className="font-mono text-charcoal/60">{orderNumber}</span>
            </p>
          )}
        </div>

        {/* Bank transfer + BLIK details */}
        {order?.paymentMethod === "transfer" && (
          <div className="bg-cream border-l-4 border-terracotta p-6 mb-8">
            <p className="text-xs tracking-widest uppercase text-clay mb-4">
              Dane do płatności
            </p>
            <div className="space-y-2 text-sm text-charcoal/80">
              {bankSettings.payment_bank_account_name && (
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/50 shrink-0">Odbiorca</span>
                  <span className="font-medium text-espresso text-right">
                    {bankSettings.payment_bank_account_name}
                  </span>
                </div>
              )}
              {bankSettings.payment_bank_account_number && (
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/50 shrink-0">Numer konta</span>
                  <span className="font-mono text-espresso text-right break-all">
                    {bankSettings.payment_bank_account_number}
                  </span>
                </div>
              )}
              {bankSettings.payment_bank_name && (
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/50 shrink-0">Bank</span>
                  <span className="text-espresso text-right">
                    {bankSettings.payment_bank_name}
                  </span>
                </div>
              )}
              {bankSettings.payment_blik_phone && (
                <div className="flex justify-between gap-4 border-t border-sand pt-2 mt-2">
                  <span className="text-charcoal/50 shrink-0">BLIK na telefon</span>
                  <span className="font-mono text-espresso text-right">
                    {bankSettings.payment_blik_phone}
                  </span>
                </div>
              )}
              {order && (
                <div className="flex justify-between gap-4 border-t border-sand pt-2 mt-2">
                  <span className="text-charcoal/50 shrink-0">Kwota</span>
                  <span className="font-serif text-lg text-espresso">
                    {order.total.toFixed(2).replace(".", ",")} zł
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-charcoal/50 shrink-0">Tytuł przelewu</span>
                <span className="text-espresso text-right">{transferTitle}</span>
              </div>
            </div>
            <p className="text-xs text-charcoal/50 mt-4 leading-relaxed">
              Płatność zrealizuj w ciągu 7 dni. Dane zostały też wysłane na Twój adres e-mail.
            </p>
          </div>
        )}

        {/* Stripe — payment processed */}
        {order?.paymentMethod === "stripe" && (
          <div className="bg-cream border-l-4 border-terracotta p-6 mb-8">
            <p className="text-xs tracking-widest uppercase text-clay mb-3">
              Płatność kartą
            </p>
            <p className="text-sm text-charcoal/70 leading-relaxed">
              Płatność kartą została zrealizowana. Potwierdzenie otrzymasz na podany adres e-mail.
            </p>
          </div>
        )}

        {/* Order summary */}
        {order && (
          <div className="bg-cream p-6 mb-8">
            <p className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">
              Podsumowanie
            </p>
            <div className="space-y-2 text-sm">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-charcoal/70">
                  <span>
                    {item.name} ×{item.quantity}
                  </span>
                  <span>
                    {(item.price * item.quantity).toFixed(2).replace(".", ",")} zł
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-charcoal/50 border-t border-sand pt-2">
                <span>Wysyłka</span>
                <span>
                  {order.shippingCost === 0
                    ? "Gratis"
                    : `${order.shippingCost.toFixed(2).replace(".", ",")} zł`}
                </span>
              </div>
              <div className="flex justify-between font-serif text-xl text-espresso border-t border-sand pt-2">
                <span>Razem</span>
                <span>{order.total.toFixed(2).replace(".", ",")} zł</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sklep"
            className="px-8 py-4 bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase transition-colors text-center"
          >
            Wróć do sklepu
          </Link>
          <Link
            href="/konto/zamowienia"
            className="px-8 py-4 border border-sand hover:border-clay text-espresso text-xs tracking-widest uppercase transition-colors text-center"
          >
            Moje zamówienia
          </Link>
        </div>
      </div>
    </div>
  );
}
