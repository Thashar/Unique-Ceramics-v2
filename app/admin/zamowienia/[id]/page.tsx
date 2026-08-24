export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import PaidAtEditor from "@/components/admin/PaidAtEditor";
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

// Status płatności – tylko do odczytu (zmienia się automatycznie przy statusie „Opłacone")
const PAYMENT_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Oczekuje", color: "bg-amber-50 text-amber-700 border-amber-300" },
  PAID:    { label: "Opłacone", color: "bg-green-50 text-green-700 border-green-300" },
  expired: { label: "Wygasła",  color: "bg-charcoal/5 text-charcoal/80 border-sand" },
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

  // Suma pozycji po cenach zapisanych w zamówieniu – razem z wysyłką daje `total`
  const itemsTotal =
    Math.round(order.items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

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
          <p className="text-xs font-mono text-charcoal/80 mt-1 select-all">{order.id}</p>
          <p className="text-xs text-charcoal/80 mt-1">
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
            <h2 className="text-xs tracking-widest uppercase text-charcoal/80">Klient</h2>
          </div>
          <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
          <p className="text-sm text-charcoal/80 mt-1">{order.email}</p>
          {order.phone && <p className="text-sm text-charcoal/80">{order.phone}</p>}
          <p className="text-xs text-clay mt-2">
            {order.user ? "Zarejestrowany klient" : "Zamówienie bez konta (gość)"}
          </p>
        </div>
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/80">
              {order.shippingMethod === "parcel_locker" ? "Paczkomat" : "Adres dostawy"}
            </h2>
          </div>
          {order.shippingMethod === "pickup" ? (
            <p className="text-sm text-charcoal/80">Odbiór osobisty w pracowni</p>
          ) : order.shippingMethod === "parcel_locker" ? (
            <>
              <p className="text-sm font-medium text-espresso font-mono">{order.parcelLockerCode ?? "–"}</p>
              <p className="text-xs text-charcoal/80 mt-1">Kod paczkomatu InPost</p>
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
          <h2 className="text-xs tracking-widest uppercase text-charcoal/80">Produkty</h2>
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
                  <p className="text-xs text-charcoal/80">
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
        {/* Kolumna sumuje się wprost: produkty + wysyłka = razem. Rabaty siedzą
            już w cenach pozycji, więc stoją pod spodem jako adnotacja – jako
            osobny wiersz odejmowania zaniżałyby sumę o swoją wartość. */}
        <div className="border-t border-sand mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-charcoal/80">
            <span>Suma produktów</span>
            <span className="tabular-nums">
              {itemsTotal.toFixed(2).replace(".", ",")} zł
            </span>
          </div>
          <div className="flex justify-between text-sm text-charcoal/80">
            <span>Wysyłka</span>
            <span className="tabular-nums">
              {order.shippingCost === 0
                ? (order.shippingMethod === "pickup" ? "Odbiór osobisty" : "Gratis")
                : `${order.shippingCost.toFixed(2).replace(".", ",")} zł`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-serif text-lg text-espresso">Razem</span>
            <span className="font-serif text-lg text-espresso tabular-nums">
              {order.total.toFixed(2).replace(".", ",")} zł
            </span>
          </div>
          {(order.discountCode || order.bundleSurcharge) && (
            <div className="border-t border-sand pt-2 space-y-1">
              {order.discountCode && (
                <p className="text-xs text-green-700">
                  Kod rabatowy <strong>{order.discountCode}</strong>
                  {order.discountAmount
                    ? ` – obniżył ceny pozycji o ${order.discountAmount.toFixed(2).replace(".", ",")} zł`
                    : " – uwzględniony w cenach pozycji"}
                </p>
              )}
              {order.bundleSurcharge ? (
                <p className="text-xs text-charcoal/80">
                  Promocja „Wielosztuki”: w cenach katalogowych był narzut{" "}
                  {order.bundleSurcharge.toFixed(2).replace(".", ",")} zł na wysyłkę.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Płatność i uwagi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/80">Płatność</h2>
          </div>
          <p className="text-sm text-espresso">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </p>
          <div className="mt-2">
            <span
              className={`inline-block border px-2 py-0.5 text-xs font-medium rounded-sm ${
                (PAYMENT_STATUS_BADGE[order.paymentStatus] ?? { color: "bg-sand text-charcoal border-sand" }).color
              }`}
            >
              {(PAYMENT_STATUS_BADGE[order.paymentStatus] ?? { label: order.paymentStatus }).label}
            </span>
          </div>

          {order.paymentStatus === "PAID" && (
            <div className="mt-3 pt-3 border-t border-sand">
              <PaidAtEditor
                orderId={order.id}
                paidAt={order.paidAt ? order.paidAt.toISOString() : null}
              />
            </div>
          )}
        </div>

        {order.note ? (
          <div className="bg-cream p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-clay" strokeWidth={1.5} />
              <h2 className="text-xs tracking-widest uppercase text-charcoal/80">Uwagi klienta</h2>
            </div>
            <p className="text-sm text-charcoal/80 leading-relaxed">{order.note}</p>
          </div>
        ) : null}
      </div>

      {/* Dane wysyłki (tylko kurier / paczkomat) */}
      {needsTracking && (
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/80">List przewozowy</h2>
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
