export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nowe",
  IN_REVIEW: "W trakcie",
  DONE: "Zrealizowane",
  CANCELLED: "Anulowane",
};

export default async function AdminCustomOrdersPage() {
  const orders = await db.customOrder.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Zamówienia indywidualne</h1>

      <div className="bg-cream">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 text-xs tracking-widest uppercase text-charcoal/50 px-4 py-3 border-b border-sand">
          <span>Klient</span>
          <span className="w-36 text-left pl-4">Rodzaj</span>
          <span className="w-28 text-center">Data</span>
          <span className="w-32 text-center">Status</span>
          <span className="w-16 text-right">Akcje</span>
        </div>

        {orders.length === 0 ? (
          <p className="text-center py-16 text-charcoal/50 text-sm">Brak zamówień indywidualnych</p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 items-center px-4 py-3 border-b border-sand hover:bg-warm-white transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-espresso">{order.customerName}</p>
                <p className="text-xs text-charcoal/50">{order.customerEmail}</p>
              </div>
              <div className="w-36 pl-4 text-xs text-charcoal/60 truncate">
                {order.orderType}
              </div>
              <div className="w-28 text-center text-xs text-charcoal/60">
                {new Date(order.createdAt).toLocaleDateString("pl-PL")}
              </div>
              <div className="w-32 text-center">
                <span
                  className={`text-[10px] tracking-widest uppercase px-2 py-1 ${STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"}`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <div className="w-16 text-right">
                <Link
                  href={`/admin/zamowienia-indywidualne/${order.id}`}
                  className="text-xs text-clay hover:text-espresso transition-colors"
                >
                  Szczegóły
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
