export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import PaymentStatusToggle from "@/components/admin/PaymentStatusToggle";
import TrackingForm from "@/components/admin/TrackingForm";
import Link from "next/link";
import { ChevronLeft, User, MapPin, Package, CreditCard, MessageSquare, Truck } from "lucide-react";

const PAYMENT_LABELS: Record<string, string> = {
  transfer: "Przelew bankowy",
  blik:     "BLIK",
  stripe:   "Karta (Stripe)",
};

const SHIPPING_LABELS: Record<string, string> = {
  courier:       "Kurier",
  parcel_locker: "Paczkomat InPost",
  pickup:        "Odbiór osobisty",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, user: true },
  });
  if (!order) notFound();

  const productSlugs = await db.product.findMany({
    where: { id: { in: order.items.map((i) => i.productId) } },
    select: { id: true, slug: true },
  }).catch(() => []);
  const slugMap = new Map(productSlugs.map((p) => [p.id, p.slug]));

  const needsTracking = order.shippingMethod !== "pickup";

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/zamowienia"
        className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Zamówienia
      </Link>

      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-espresso">Zamówienie</h1>
          <p className="text-xs font-mono text-charcoal/35 mt-1 select-all">{order.id}</p>
          <p className="text-xs text-charcoal/45 mt-1">
            {new Date(order.createdAt).toLocaleDateString("pl-PL", {
              day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <OrderStatusSelect
          orderId={order.id}
          currentStatus={order.status}
          shippingMethod={order.shippingMethod}
          hasTracking={!!(order.trackingNumber && order.trackingCarrier)}
        />
      </div>

      {/* Klient i adres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Klient</h2>
          </div>
          <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
          <p className="text-sm text-charcoal/80 mt-1">{order.email}</p>
          {order.phone && <p className="text-sm text-charcoal/80">{order.phone}</p>}
          {order.user && (
            <p className="text-xs text-terracotta mt-2">Zarejestrowany klient</p>
          )}
        </div>
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50">
              {order.shippingMethod === "parcel_locker" ? "Paczkomat" : "Adres dostawy"}
            </h2>
          </div>
          {order.shippingMethod === "pickup" ? (
            <p className="text-sm text-charcoal/80">Odbiór osobisty w pracowni</p>
          ) : order.shippingMethod === "parcel_locker" ? (
            <>
              <p className="text-sm font-medium text-espresso font-mono">{order.parcelLockerCode ?? "—"}</p>
              <p className="text-xs text-charcoal/50 mt-1">Kod paczkomatu InPost</p>
            </>
          ) : (
            <>
              <p className="text-sm text-charcoal/80">{order.street}</p>
              <p className="text-sm text-charcoal/80">{order.postcode} {order.city}</p>
              <p className="text-sm text-charcoal/80">{order.country}</p>
            </>
          )}
          <p className="text-xs text-clay mt-2 font-medium">
            {SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod}
          </p>
        </div>
      </div>

      {/* Produkty */}
      <div className="bg-cream p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Package size={14} className="text-clay" strokeWidth={1.5} />
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Produkty</h2>
        </div>
        <div className="space-y-2.5">
          {order.items.map((item) => {
            const slug = slugMap.get(item.productId);
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {slug ? (
                    <Link
                      href={`/sklep/${slug}`}
                      target="_blank"
                      className="text-sm text-espresso hover:text-clay underline-offset-2 hover:underline transition-colors"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <p className="text-sm text-espresso">{item.name}</p>
                  )}
                  <p className="text-xs text-charcoal/45">
                    {item.price.toFixed(2).replace(".", ",")} zł × {item.quantity}
                  </p>
                </div>
                <p className="text-sm text-espresso tabular-nums shrink-0">
                  {(item.price * item.quantity).toFixed(2).replace(".", ",")} zł
                </p>
              </div>
            );
          })}
        </div>
        <div className="border-t border-sand mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-charcoal/55">
            <span>Wysyłka</span>
            <span className="tabular-nums">
              {order.shippingCost === 0
                ? (order.shippingMethod === "pickup" ? "Odbiór osobisty" : "Gratis")
                : `${order.shippingCost} zł`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-serif text-lg text-espresso">Razem</span>
            <span className="font-serif text-lg text-espresso tabular-nums">
              {order.total.toFixed(2).replace(".", ",")} zł
            </span>
          </div>
        </div>
      </div>

      {/* Płatność i uwagi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Płatność</h2>
          </div>
          <p className="text-sm text-espresso">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </p>
          <PaymentStatusToggle orderId={order.id} currentStatus={order.paymentStatus} />
        </div>

        {order.note ? (
          <div className="bg-cream p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-clay" strokeWidth={1.5} />
              <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Uwagi klienta</h2>
            </div>
            <p className="text-sm text-charcoal/75 leading-relaxed">{order.note}</p>
          </div>
        ) : null}
      </div>

      {/* Dane wysyłki (tylko kurier / paczkomat) */}
      {needsTracking && (
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50">List przewozowy</h2>
          </div>
          <TrackingForm
            orderId={order.id}
            orderStatus={order.status}
            initialTrackingNumber={order.trackingNumber}
            initialCarrier={order.trackingCarrier}
          />
        </div>
      )}
    </div>
  );
}
