export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import Link from "next/link";
import { ChevronLeft, User, MapPin, Package, CreditCard, MessageSquare } from "lucide-react";

const PAYMENT_LABELS: Record<string, string> = {
  transfer: "Przelew bankowy",
  blik:     "BLIK",
  stripe:   "Karta (Stripe)",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID:    "bg-green-50 text-green-700",
  FAILED:  "bg-red-50 text-red-600",
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
        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
      </div>

      {/* Klient i adres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Klient</h2>
          </div>
          <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
          <p className="text-sm text-charcoal/60 mt-1">{order.email}</p>
          {order.phone && <p className="text-sm text-charcoal/60">{order.phone}</p>}
          {order.user && (
            <p className="text-xs text-terracotta mt-2">Zarejestrowany klient</p>
          )}
        </div>
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Adres dostawy</h2>
          </div>
          <p className="text-sm text-charcoal/80">{order.street}</p>
          <p className="text-sm text-charcoal/80">{order.postcode} {order.city}</p>
          <p className="text-sm text-charcoal/80">{order.country}</p>
        </div>
      </div>

      {/* Produkty */}
      <div className="bg-cream p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Package size={14} className="text-clay" strokeWidth={1.5} />
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Produkty</h2>
        </div>
        <div className="space-y-2.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-espresso">{item.name}</p>
                <p className="text-xs text-charcoal/45">
                  {item.price.toFixed(2).replace(".", ",")} zł × {item.quantity}
                </p>
              </div>
              <p className="text-sm text-espresso tabular-nums shrink-0">
                {(item.price * item.quantity).toFixed(2).replace(".", ",")} zł
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-sand mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-charcoal/55">
            <span>Wysyłka</span>
            <span className="tabular-nums">
              {order.shippingCost === 0 ? "Gratis" : `${order.shippingCost} zł`}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-cream p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-clay" strokeWidth={1.5} />
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50">Płatność</h2>
          </div>
          <p className="text-sm text-espresso">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </p>
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-sm ${
            PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-sand text-charcoal"
          }`}>
            {order.paymentStatus === "PENDING" ? "Oczekuje" :
             order.paymentStatus === "PAID" ? "Opłacone" :
             order.paymentStatus === "FAILED" ? "Nieudana" : order.paymentStatus}
          </span>
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
    </div>
  );
}
