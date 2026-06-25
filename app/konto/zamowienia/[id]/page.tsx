export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Package, MapPin, CreditCard, Clock, Truck, ExternalLink } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import StripeResumeButton from "@/components/account/StripeResumeButton";

const CARRIER_LABELS: Record<string, string> = {
  dpd:    "DPD",
  dhl:    "DHL",
  inpost: "InPost",
  poczta: "Poczta Polska",
};

const SHIPPING_LABELS: Record<string, string> = {
  courier:       "Kurier",
  parcel_locker: "Paczkomat InPost",
  pickup:        "Odbiór osobisty",
};

function carrierTrackUrl(carrier: string, number: string): string {
  switch (carrier) {
    case "dpd":    return `https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=${number}`;
    case "dhl":    return `https://www.dhl.com/pl-pl/home/tracking/tracking-express.html?submit=1&tracking-id=${number}`;
    case "inpost": return `https://inpost.pl/sledzenie-przesylek?number=${number}`;
    case "poczta": return `https://emonitoring.poczta-polska.pl/?numer=${number}`;
    default:       return "";
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/logowanie");

  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order || order.userId !== session.user!.id) notFound();

  const productSlugs = await db.product.findMany({
    where: { id: { in: order.items.map((i) => i.productId) } },
    select: { id: true, slug: true },
  }).catch(() => []);
  const slugMap = new Map(productSlugs.map((p) => [p.id, p.slug]));

  const statusSteps = [
    { key: "PENDING",     label: "Przyjęte" },
    { key: "CONFIRMED",   label: "Potwierdzone" },
    { key: "PAID",        label: "Opłacone" },
    { key: "IN_PROGRESS", label: "W realizacji" },
    { key: "SHIPPED",     label: "Wysłane" },
    { key: "DELIVERED",   label: "Dostarczone" },
  ];
  const currentStep = statusSteps.findIndex((s) => s.key === order.status);

  // Tytuł przelewu (dla zamówień przelewem oczekujących na płatność)
  const orderNumber = order.id.slice(-8).toUpperCase();
  const transferTitlePrefix = await getSetting("payment_bank_transfer_title").catch(() => "Zamówienie");
  const transferTitle = `${transferTitlePrefix || "Zamówienie"} #${orderNumber}`;

  const trackingUrl = order.trackingNumber && order.trackingCarrier
    ? carrierTrackUrl(order.trackingCarrier, order.trackingNumber)
    : null;
  const carrierLabel = order.trackingCarrier ? (CARRIER_LABELS[order.trackingCarrier] ?? order.trackingCarrier) : null;

  return (
    <div>
      <Link
        href="/konto/zamowienia"
        className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors mb-8"
      >
        <ChevronLeft size={14} strokeWidth={1.5} />
        Wszystkie zamówienia
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-2xl text-espresso">
            Zamówienie #{order.id.slice(-8).toUpperCase()}
          </h2>
          <p className="text-sm text-charcoal/50 mt-1">
            Złożone {new Date(order.createdAt).toLocaleDateString("pl-PL", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Pasek postępu (tylko dla aktywnych, nie dla anulowanych) */}
      {order.status !== "CANCELLED" && (
        <div className="bg-cream p-6 mb-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-4 h-px bg-sand" />
            {statusSteps.map((step, i) => {
              const done = i <= currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      done
                        ? "bg-terracotta text-warm-white"
                        : "bg-sand text-charcoal/40"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <p className={`text-[10px] tracking-wider uppercase text-center max-w-[60px] ${done ? "text-espresso" : "text-charcoal/40"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Śledzenie przesyłki */}
      {order.trackingNumber && order.trackingCarrier && (
        <div className="bg-cream border border-clay/20 p-5 mb-6">
          <h3 className="text-xs tracking-widest uppercase text-clay mb-3 flex items-center gap-2">
            <Truck size={14} strokeWidth={1.5} />
            Śledzenie przesyłki
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-charcoal/60">Dostawca: <span className="text-espresso font-medium">{carrierLabel}</span></p>
              <p className="text-sm text-charcoal/60 mt-0.5">Numer listu: <span className="text-espresso font-mono">{order.trackingNumber}</span></p>
            </div>
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-clay hover:bg-espresso text-warm-white text-xs uppercase tracking-wide px-4 py-2.5 transition-colors shrink-0"
              >
                <ExternalLink size={13} />
                Śledź przesyłkę
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Produkty */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-serif text-xl text-espresso flex items-center gap-2">
            <Package size={18} strokeWidth={1.5} className="text-clay" />
            Zamówione produkty
          </h3>
          <div className="bg-cream divide-y divide-sand">
            {order.items.map((item) => {
              const slug = slugMap.get(item.productId);
              return (
                <div key={item.id} className="flex items-center justify-between p-4">
                  <div>
                    {slug ? (
                      <Link
                        href={`/sklep/${slug}`}
                        className="text-sm font-medium text-espresso hover:text-clay underline-offset-2 hover:underline transition-colors"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-espresso">{item.name}</p>
                    )}
                    <p className="text-xs text-charcoal/50 mt-0.5">
                      {item.price.toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 })} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-serif text-lg text-espresso">
                    {(item.price * item.quantity).toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 })}
                  </p>
                </div>
              );
            })}
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm text-charcoal/80">
                <span>Suma produktów</span>
                <span>{(order.total - order.shippingCost).toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-sm text-charcoal/80">
                <span>Wysyłka</span>
                <span>
                  {order.shippingCost === 0
                    ? (order.shippingMethod === "pickup" ? "Odbiór osobisty" : "Gratis")
                    : order.shippingCost.toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-base font-medium text-espresso border-t border-sand pt-2">
                <span>Do zapłaty</span>
                <span className="font-serif text-xl">
                  {order.total.toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Adres / metoda wysyłki */}
          <div className="bg-cream p-5">
            <h3 className="text-xs tracking-widest uppercase text-clay mb-3 flex items-center gap-2">
              <MapPin size={14} strokeWidth={1.5} />
              {order.shippingMethod === "parcel_locker" ? "Paczkomat" : "Dostawa"}
            </h3>
            <p className="text-xs text-clay font-medium mb-2">{SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod}</p>
            {order.shippingMethod === "pickup" ? (
              <p className="text-sm text-charcoal/70">Odbiór osobisty w pracowni — Familijna 23, 44-164 Kleszczów</p>
            ) : order.shippingMethod === "parcel_locker" ? (
              <>
                <p className="text-sm text-espresso font-mono font-medium">{order.parcelLockerCode ?? "—"}</p>
                <p className="text-xs text-charcoal/50 mt-1">Kod paczkomatu InPost</p>
              </>
            ) : (
              <>
                <p className="text-sm text-espresso font-medium">{order.firstName} {order.lastName}</p>
                <p className="text-sm text-charcoal/70 mt-1">{order.street}</p>
                <p className="text-sm text-charcoal/70">{order.postcode} {order.city}</p>
                {order.phone && <p className="text-sm text-charcoal/70 mt-1">{order.phone}</p>}
                <p className="text-sm text-charcoal/70">{order.email}</p>
              </>
            )}
          </div>

          {/* Płatność */}
          <div className="bg-cream p-5">
            <h3 className="text-xs tracking-widest uppercase text-clay mb-3 flex items-center gap-2">
              <CreditCard size={14} strokeWidth={1.5} />
              Płatność
            </h3>
            <p className="text-sm text-espresso">
              {order.paymentMethod === "transfer" ? "Przelew bankowy" :
               order.paymentMethod === "blik" ? "BLIK" :
               order.paymentMethod === "stripe" ? "Karta (Stripe)" :
               order.paymentMethod}
            </p>
            <p className={`text-xs mt-1 ${order.paymentStatus === "PAID" ? "text-green-600" : "text-amber-600"}`}>
              {order.paymentStatus === "PAID" ? "Opłacone" : "Oczekuje na płatność"}
            </p>
            {order.paymentMethod === "transfer" && order.paymentStatus !== "PAID" && (
              <div className="mt-3 pt-3 border-t border-sand">
                <p className="text-[11px] tracking-widest uppercase text-charcoal/45 mb-1">Tytuł przelewu</p>
                <p className="text-sm text-espresso font-medium select-all">{transferTitle}</p>
              </div>
            )}
            {order.paymentMethod === "stripe" && order.paymentStatus !== "PAID" && (
              <StripeResumeButton orderId={order.id} />
            )}
          </div>

          {/* Uwagi */}
          {order.note && (
            <div className="bg-cream p-5">
              <h3 className="text-xs tracking-widest uppercase text-clay mb-3 flex items-center gap-2">
                <Clock size={14} strokeWidth={1.5} />
                Uwagi
              </h3>
              <p className="text-sm text-charcoal/70">{order.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
