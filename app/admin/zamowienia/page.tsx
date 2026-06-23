export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import { Suspense } from "react";
import { ShoppingBag } from "lucide-react";
import OrdersTabs from "@/components/admin/OrdersTabs";
import OrdersSearch from "@/components/admin/OrdersSearch";
import type { Prisma } from "@prisma/client";

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  CONFIRMED:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  IN_PROGRESS: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  SHIPPED:     "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  DELIVERED:   "bg-green-50 text-green-700 ring-1 ring-green-200",
  CANCELLED:   "bg-red-50 text-red-600 ring-1 ring-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "Nowe",
  CONFIRMED:   "Potwierdzone",
  IN_PROGRESS: "W realizacji",
  SHIPPED:     "Wysłane",
  DELIVERED:   "Dostarczone",
  CANCELLED:   "Anulowane",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status as never;
  if (q) {
    where.OR = [
      { id:        { contains: q, mode: "insensitive" } },
      { email:     { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName:  { contains: q, mode: "insensitive" } },
      { phone:     { contains: q, mode: "insensitive" } },
      { street:    { contains: q, mode: "insensitive" } },
      { city:      { contains: q, mode: "insensitive" } },
      { postcode:  { contains: q, mode: "insensitive" } },
    ];
  }

  const [allOrders, filteredOrders] = await Promise.all([
    db.order.findMany({ select: { status: true } }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
  ]);

  const counts = allOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-6">Zamówienia</h1>

      <Suspense fallback={null}>
        <OrdersTabs counts={counts} />
      </Suspense>

      <Suspense fallback={null}>
        <OrdersSearch />
      </Suspense>

      {filteredOrders.length === 0 ? (
        <div className="bg-cream border border-sand/60 p-16 text-center">
          <ShoppingBag size={36} strokeWidth={1} className="mx-auto mb-4 text-sand" />
          <p className="text-sm text-charcoal/45">
            {q ? `Brak wyników dla „${q}"` : "Brak zamówień w tej kategorii"}
          </p>
        </div>
      ) : (
        <div className="bg-cream border border-sand/60">
          {/* Nagłówek tabeli — tylko desktop */}
          <div className="hidden md:grid md:grid-cols-[96px_1fr_120px_110px_140px_80px] text-[11px] tracking-widest uppercase text-charcoal/45 px-4 py-3 border-b border-sand">
            <span>Nr</span>
            <span>Klient</span>
            <span className="text-center">Data</span>
            <span className="text-right">Wartość</span>
            <span className="text-center">Status</span>
            <span className="text-right">Akcja</span>
          </div>

          {filteredOrders.map((order) => {
            const orderNumber = order.id.slice(-8).toUpperCase();
            return (
              <Link
                key={order.id}
                href={`/admin/zamowienia/${order.id}`}
                className="block border-b border-sand/60 last:border-0 hover:bg-warm-white transition-colors"
              >
                {/* Mobile */}
                <div className="md:hidden px-4 py-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-mono text-charcoal/40 mb-0.5">#{orderNumber}</p>
                      <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
                      <p className="text-xs text-charcoal/45">{order.email}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-sm ${
                      STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"
                    }`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-charcoal/45">
                      {order.items.length} szt. · {new Date(order.createdAt).toLocaleDateString("pl-PL")}
                    </span>
                    <span className="font-medium text-espresso tabular-nums">
                      {order.total.toFixed(2).replace(".", ",")} zł
                    </span>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden md:grid md:grid-cols-[96px_1fr_120px_110px_140px_80px] items-center px-4 py-3">
                  <div className="font-mono text-[11px] text-charcoal/50">
                    #{orderNumber}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
                    <p className="text-xs text-charcoal/45 mt-0.5">{order.email}</p>
                  </div>
                  <div className="text-center text-xs text-charcoal/55">
                    {new Date(order.createdAt).toLocaleDateString("pl-PL")}
                  </div>
                  <div className="text-right text-sm text-espresso tabular-nums">
                    {order.total.toFixed(2).replace(".", ",")} zł
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-sm ${
                      STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"
                    }`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="text-right text-xs text-clay hover:text-espresso transition-colors">
                    Szczegóły →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
