export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import { Package, ShoppingBag, Users, TrendingUp } from "lucide-react";

export default async function AdminDashboard() {
  const [products, orders, users] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.order.count(),
    db.user.count(),
  ]);

  const recentOrders = await db.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const revenue = await db.order.aggregate({
    _sum: { total: true },
    where: { status: { not: "CANCELLED" } },
  });

  const stats = [
    { label: "Produkty aktywne", value: products, icon: Package, href: "/admin/produkty" },
    { label: "Zamówienia", value: orders, icon: ShoppingBag, href: "/admin/zamowienia" },
    { label: "Użytkownicy", value: users, icon: Users, href: "#" },
    { label: "Przychód", value: `${(revenue._sum.total ?? 0).toFixed(0)} zł`, icon: TrendingUp, href: "#" },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}
            className="bg-cream p-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <Icon size={20} strokeWidth={1.5} className="text-clay" />
            </div>
            <p className="font-serif text-3xl text-espresso">{value}</p>
            <p className="text-xs tracking-widest uppercase text-charcoal/50 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-cream p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-espresso">Ostatnie zamówienia</h2>
          <Link href="/admin/zamowienia" className="text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors">
            Wszystkie →
          </Link>
        </div>
        <div className="space-y-3">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-charcoal/50 text-center py-8">Brak zamówień</p>
          ) : (
            recentOrders.map((order) => (
              <Link key={order.id} href={`/admin/zamowienia/${order.id}`}
                className="flex items-center justify-between p-4 bg-warm-white hover:bg-sand/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-espresso">{order.firstName} {order.lastName}</p>
                  <p className="text-xs text-charcoal/50 mt-0.5">{order.items.length} szt. · {new Date(order.createdAt).toLocaleDateString("pl-PL")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-espresso">{order.total.toFixed(2).replace(".", ",")} zł</p>
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 mt-1 inline-block ${
                    order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                    order.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                    "bg-terracotta/10 text-terracotta"
                  }`}>{order.status}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
