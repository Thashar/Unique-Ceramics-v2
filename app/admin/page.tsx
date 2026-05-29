export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import {
  Package, ShoppingBag, Users, TrendingUp,
  AlertCircle, ArrowRight, Plus, Settings, ClipboardList,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "Nowe",
  CONFIRMED:   "Potwierdzone",
  IN_PROGRESS: "W realizacji",
  SHIPPED:     "Wysłane",
  DELIVERED:   "Dostarczone",
  CANCELLED:   "Anulowane",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  CONFIRMED:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  IN_PROGRESS: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  SHIPPED:     "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  DELIVERED:   "bg-green-50 text-green-700 ring-1 ring-green-200",
  CANCELLED:   "bg-red-50 text-red-600 ring-1 ring-red-200",
};

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [productCount, orderCount, userCount, pendingCount, newCustomOrderCount] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.order.count(),
    db.user.count(),
    db.order.count({ where: { status: "PENDING" } }),
    db.customOrder.count({ where: { status: "NEW" } }),
  ]);

  const [revenueAll, revenueMonth, recentOrders] = await Promise.all([
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "CANCELLED" } },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: {
        status: { not: "CANCELLED" },
        createdAt: { gte: monthStart },
      },
    }),
    db.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
  ]);

  const stats = [
    {
      label: "Aktywne produkty",
      value: productCount,
      icon: Package,
      href: "/admin/produkty",
    },
    {
      label: "Wszystkie zamówienia",
      value: orderCount,
      icon: ShoppingBag,
      href: "/admin/zamowienia",
    },
    {
      label: "Zarejestrowani klienci",
      value: userCount,
      icon: Users,
      href: "#",
    },
    {
      label: "Przychód łącznie",
      value: `${(revenueAll._sum.total ?? 0).toFixed(0)} zł`,
      icon: TrendingUp,
      sub: `${(revenueMonth._sum.total ?? 0).toFixed(0)} zł w tym miesiącu`,
      href: "#",
    },
  ];

  const needsAttention = pendingCount > 0 || newCustomOrderCount > 0;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-espresso">Dashboard</h1>
        <Link
          href="/admin/produkty/nowy"
          className="flex items-center gap-2 bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
        >
          <Plus size={14} />
          Dodaj produkt
        </Link>
      </div>

      {/* Wymaga uwagi */}
      {needsAttention && (
        <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle size={17} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 mb-1">Wymaga uwagi</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {pendingCount > 0 && (
                <Link
                  href="/admin/zamowienia?status=PENDING"
                  className="text-sm text-amber-700 hover:underline"
                >
                  {pendingCount} nowe zamówienie{pendingCount > 1 ? "a" : ""} czeka na potwierdzenie →
                </Link>
              )}
              {newCustomOrderCount > 0 && (
                <Link
                  href="/admin/zamowienia-indywidualne"
                  className="text-sm text-amber-700 hover:underline"
                >
                  {newCustomOrderCount} nowe zamówienie indywidualne →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statystyki */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, sub }) => (
          <Link
            key={label}
            href={href}
            className="bg-cream p-5 hover:shadow-md transition-all group border border-transparent hover:border-sand"
          >
            <div className="w-9 h-9 bg-warm-white rounded-full flex items-center justify-center mb-4">
              <Icon size={17} strokeWidth={1.5} className="text-clay" />
            </div>
            <p className="font-serif text-2xl text-espresso leading-none tabular-nums">{value}</p>
            {sub && <p className="text-[11px] text-terracotta mt-1">{sub}</p>}
            <p className="text-[11px] tracking-widest uppercase text-charcoal/45 mt-1.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Główna siatka */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Ostatnie zamówienia */}
        <div className="lg:col-span-2 bg-cream p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-lg text-espresso">Ostatnie zamówienia</h2>
            <Link
              href="/admin/zamowienia"
              className="flex items-center gap-1 text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors"
            >
              Wszystkie <ArrowRight size={12} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-sm text-charcoal/40 text-center py-10">Brak zamówień</p>
          ) : (
            <div className="space-y-1.5">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/zamowienia/${order.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 bg-warm-white hover:bg-sand/30 transition-colors rounded-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-espresso truncate">
                      {order.firstName} {order.lastName}
                    </p>
                    <p className="text-xs text-charcoal/45 mt-0.5">
                      {order.items.length} szt. · {new Date(order.createdAt).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-sm ${
                      STATUS_COLORS[order.status] ?? "bg-sand text-charcoal"
                    }`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-sm text-espresso tabular-nums w-20 text-right">
                      {order.total.toFixed(2).replace(".", ",")} zł
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Panel boczny */}
        <div className="space-y-4">
          {/* Szybkie akcje */}
          <div className="bg-cream p-5">
            <h2 className="font-serif text-base text-espresso mb-3">Szybkie akcje</h2>
            <div className="space-y-1.5">
              <Link
                href="/admin/produkty/nowy"
                className="flex items-center gap-2.5 px-3 py-2.5 bg-warm-white hover:bg-sand/30 transition-colors rounded-sm text-sm text-charcoal/70 hover:text-espresso"
              >
                <Plus size={15} className="text-clay shrink-0" />
                Dodaj produkt
              </Link>
              <Link
                href="/admin/zamowienia?status=PENDING"
                className="flex items-center gap-2.5 px-3 py-2.5 bg-warm-white hover:bg-sand/30 transition-colors rounded-sm text-sm text-charcoal/70 hover:text-espresso"
              >
                <ShoppingBag size={15} className="text-clay shrink-0" />
                <span className="flex-1">Nowe zamówienia</span>
                {pendingCount > 0 && (
                  <span className="bg-terracotta text-white text-[10px] font-medium w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/zamowienia-indywidualne"
                className="flex items-center gap-2.5 px-3 py-2.5 bg-warm-white hover:bg-sand/30 transition-colors rounded-sm text-sm text-charcoal/70 hover:text-espresso"
              >
                <ClipboardList size={15} className="text-clay shrink-0" />
                <span className="flex-1">Zam. indywidualne</span>
                {newCustomOrderCount > 0 && (
                  <span className="bg-terracotta text-white text-[10px] font-medium w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {newCustomOrderCount}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/ustawienia?s=wysylka"
                className="flex items-center gap-2.5 px-3 py-2.5 bg-warm-white hover:bg-sand/30 transition-colors rounded-sm text-sm text-charcoal/70 hover:text-espresso"
              >
                <Settings size={15} className="text-clay shrink-0" />
                Ustawienia wysyłki
              </Link>
            </div>
          </div>

          {/* Przychód w tym miesiącu */}
          <div className="bg-cream p-5">
            <p className="text-[11px] tracking-widest uppercase text-charcoal/45 mb-1">Ten miesiąc</p>
            <p className="font-serif text-2xl text-espresso tabular-nums">
              {(revenueMonth._sum.total ?? 0).toFixed(0)} zł
            </p>
            <p className="text-xs text-charcoal/40 mt-2">
              Łącznie: {(revenueAll._sum.total ?? 0).toFixed(0)} zł
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
