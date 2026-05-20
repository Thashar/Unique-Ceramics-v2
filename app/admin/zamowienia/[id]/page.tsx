export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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
      <Link href="/admin/zamowienia"
        className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors mb-6">
        <ChevronLeft size={14} />
        Zamówienia
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-espresso">Zamówienie</h1>
          <p className="text-xs font-mono text-charcoal/40 mt-1">{order.id}</p>
        </div>
        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-cream p-6">
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Klient</h2>
          <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
          <p className="text-sm text-charcoal/60 mt-1">{order.email}</p>
          {order.phone && <p className="text-sm text-charcoal/60">{order.phone}</p>}
        </div>
        <div className="bg-cream p-6">
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Adres dostawy</h2>
          <p className="text-sm text-charcoal/80">{order.street}</p>
          <p className="text-sm text-charcoal/80">{order.postcode} {order.city}</p>
          <p className="text-sm text-charcoal/80">{order.country}</p>
        </div>
      </div>

      <div className="bg-cream p-6 mb-6">
        <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-4">Produkty</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-charcoal/80">{item.name} × {item.quantity}</span>
              <span className="text-espresso">{(item.price * item.quantity).toFixed(2).replace(".", ",")} zł</span>
            </div>
          ))}
        </div>
        <div className="border-t border-sand mt-4 pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-charcoal/60">
            <span>Wysyłka</span>
            <span>{order.shippingCost === 0 ? "Gratis" : `${order.shippingCost} zł`}</span>
          </div>
          <div className="flex justify-between font-serif text-lg text-espresso">
            <span>Razem</span>
            <span>{order.total.toFixed(2).replace(".", ",")} zł</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-cream p-6">
          <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-2">Płatność</h2>
          <p className="text-sm text-espresso capitalize">{order.paymentMethod}</p>
          <p className="text-xs text-charcoal/50 mt-1">Status: {order.paymentStatus}</p>
        </div>
        {order.note && (
          <div className="bg-cream p-6">
            <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-2">Uwagi</h2>
            <p className="text-sm text-charcoal/80">{order.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
