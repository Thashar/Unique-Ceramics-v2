export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  NEW:        "bg-yellow-100 text-yellow-700",
  IN_REVIEW:  "bg-blue-100 text-blue-700",
  DONE:       "bg-green-100 text-green-700",
  CANCELLED:  "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  NEW:        "Nowe",
  IN_REVIEW:  "W trakcie",
  DONE:       "Zrealizowane",
  CANCELLED:  "Anulowane",
};

export default async function AdminCustomOrdersPage() {
  const orders = await db.customOrder.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-6">Zamówienia indywidualne</h1>

      {orders.length === 0 ? (
        <div className="bg-cream p-16 text-center text-charcoal/50 text-sm">Brak zamówień indywidualnych</div>
      ) : (
        <div className="space-y-2">
          {/* Nagłówek — tylko desktop */}
          <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_auto] text-xs tracking-widest uppercase text-charcoal/50 bg-cream px-4 py-3 border-b border-sand">
            <span>Klient</span>
            <span className="w-36 pl-4">Rodzaj</span>
            <span className="w-28 text-center">Data</span>
            <span className="w-32 text-center">Status</span>
            <span className="w-20 text-right">Akcje</span>
          </div>

          {orders.map((order) => (
            <Link key={order.id} href={`/admin/zamowienia-indywidualne/${order.id}`}
              className="block bg-cream hover:bg-warm-white transition-colors border-b border-sand last:border-0">

              {/* Mobile */}
              <div className="md:hidden px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-espresso">{order.customerName}</p>
                    <p className="text-xs text-charcoal/50">{order.customerEmail}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] tracking-widest uppercase px-2 py-1 ${STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-charcoal/80 truncate max-w-[60%]">{order.orderType}</p>
                  <p className="text-xs text-charcoal/50">{new Date(order.createdAt).toLocaleDateString("pl-PL")}</p>
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_auto] items-center px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-espresso">{order.customerName}</p>
                  <p className="text-xs text-charcoal/50">{order.customerEmail}</p>
                </div>
                <div className="w-36 pl-4 text-xs text-charcoal/80 truncate">{order.orderType}</div>
                <div className="w-28 text-center text-xs text-charcoal/80">
                  {new Date(order.createdAt).toLocaleDateString("pl-PL")}
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
