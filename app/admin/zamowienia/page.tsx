export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-yellow-100 text-yellow-700",
  CONFIRMED:   "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  SHIPPED:     "bg-purple-100 text-purple-700",
  DELIVERED:   "bg-green-100 text-green-700",
  CANCELLED:   "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "Nowe",
  CONFIRMED:   "Potwierdzone",
  IN_PROGRESS: "W realizacji",
  SHIPPED:     "Wysłane",
  DELIVERED:   "Dostarczone",
  CANCELLED:   "Anulowane",
};

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-6">Zamówienia</h1>

      {orders.length === 0 ? (
        <div className="bg-cream p-16 text-center text-charcoal/50 text-sm">Brak zamówień</div>
      ) : (
        <div className="space-y-2">
          {/* Nagłówek — tylko desktop */}
          <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_auto] text-xs tracking-widest uppercase text-charcoal/50 bg-cream px-4 py-3 border-b border-sand">
            <span>Klient</span>
            <span className="w-28 text-center">Data</span>
            <span className="w-24 text-right">Wartość</span>
            <span className="w-32 text-center">Status</span>
            <span className="w-20 text-right">Akcje</span>
          </div>

          {orders.map((order) => (
            <Link key={order.id} href={`/admin/zamowienia/${order.id}`}
              className="block bg-cream hover:bg-warm-white transition-colors border-b border-sand last:border-0">

              {/* Mobile */}
              <div className="md:hidden px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
                    <p className="text-xs text-charcoal/50">{order.email}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] tracking-widest uppercase px-2 py-1 ${STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-charcoal/50">{new Date(order.createdAt).toLocaleDateString("pl-PL")}</p>
                  <p className="text-sm font-medium text-espresso">{order.total.toFixed(2).replace(".", ",")} zł</p>
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_auto] items-center px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
                  <p className="text-xs text-charcoal/50">{order.email}</p>
                </div>
                <div className="w-28 text-center text-xs text-charcoal/60">
                  {new Date(order.createdAt).toLocaleDateString("pl-PL")}
                </div>
                <div className="w-24 text-right text-sm text-espresso">
                  {order.total.toFixed(2).replace(".", ",")} zł
                </div>
                <div className="w-32 text-center">
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-1 ${STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <div className="w-20 text-right text-xs text-clay hover:text-espresso transition-colors">
                  Szczegóły
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
