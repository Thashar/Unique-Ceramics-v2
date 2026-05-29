export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag, User, LayoutDashboard } from "lucide-react";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";

export default async function AccountDashboard() {
  const session = await auth();
  const userId = session!.user!.id;
  const isAdmin = session!.user!.role === "ADMIN";

  const recentOrders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { items: true },
  });

  const totalOrders = await db.order.count({ where: { userId } });

  return (
    <div className="space-y-8">
      {/* Statystyki */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-cream p-6">
          <p className="text-xs tracking-widest uppercase text-clay mb-2">Zamówienia</p>
          <p className="font-serif text-4xl text-espresso">{totalOrders}</p>
        </div>
        <div className="bg-cream p-6">
          <p className="text-xs tracking-widest uppercase text-clay mb-2">Status konta</p>
          <p className="font-serif text-lg text-espresso mt-2">Aktywne</p>
        </div>
        <div className="bg-cream p-6">
          <p className="text-xs tracking-widest uppercase text-clay mb-2">Typ konta</p>
          <p className="font-serif text-lg text-espresso mt-2">{isAdmin ? "Admin" : "Klient"}</p>
        </div>
      </div>

      {/* Ostatnie zamówienia */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-2xl text-espresso">Ostatnie zamówienia</h2>
          {totalOrders > 0 && (
            <Link
              href="/konto/zamowienia"
              className="text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors flex items-center gap-1"
            >
              Wszystkie <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-cream p-12 text-center">
            <ShoppingBag size={40} strokeWidth={1} className="mx-auto text-sand mb-4" />
            <p className="text-charcoal/60 mb-6">Nie masz jeszcze żadnych zamówień.</p>
            <Link
              href="/sklep"
              className="inline-flex items-center gap-2 bg-clay hover:bg-terracotta text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
            >
              Przejdź do sklepu
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/konto/zamowienia/${order.id}`}
                className="flex items-center justify-between bg-cream hover:bg-sand/50 transition-colors p-5 group"
              >
                <div className="flex items-center gap-4">
                  <Package size={20} strokeWidth={1.5} className="text-clay flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-espresso">
                      Zamówienie #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-charcoal/50 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      · {order.items.length}{" "}
                      {order.items.length === 1 ? "produkt" : "produkty"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status} />
                  <p className="font-serif text-lg text-espresso hidden sm:block">
                    {order.total.toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 })}
                  </p>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-charcoal/30 group-hover:text-clay transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Skróty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/sklep"
          className="flex items-center gap-4 bg-espresso hover:bg-charcoal text-cream p-6 transition-colors group"
        >
          <ShoppingBag size={24} strokeWidth={1.5} />
          <div>
            <p className="font-medium text-sm">Przeglądaj sklep</p>
            <p className="text-xs text-cream/60">Nowe produkty w kolekcji</p>
          </div>
          <ChevronRight size={16} className="ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          href="/konto/profil"
          className="flex items-center gap-4 bg-cream hover:bg-sand/70 text-espresso p-6 transition-colors group"
        >
          <User size={24} strokeWidth={1.5} />
          <div>
            <p className="font-medium text-sm">Edytuj profil</p>
            <p className="text-xs text-charcoal/50">Dane osobowe i hasło</p>
          </div>
          <ChevronRight size={16} className="ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-4 bg-clay hover:bg-terracotta text-warm-white p-6 transition-colors group sm:col-span-2"
          >
            <LayoutDashboard size={24} strokeWidth={1.5} />
            <div>
              <p className="font-medium text-sm">Panel admina</p>
              <p className="text-xs text-warm-white/60">Zarządzaj sklepem</p>
            </div>
            <ChevronRight size={16} className="ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
    </div>
  );
}
