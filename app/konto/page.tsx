export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Package, ChevronRight, ShoppingBag, User, LayoutDashboard, MapPin, Wallet, CalendarDays, ArrowRight,
} from "lucide-react";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import ClayRule from "@/components/ui/ClayRule";

function fmtMoney(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} zł`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Przegląd konta. Statystyki mówią o kliencie, nie o systemie – „status
 * aktywne” i „typ klient” (do 16.09.2026) niczego nie wnosiły. Zapytania
 * sekwencyjnie (jeden klient Prismy, pula Supabase).
 */
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
  // Wydane = zamówienia opłacone i nieanulowane
  const paid = await db.order.aggregate({
    _sum: { total: true },
    where: { userId, paymentStatus: "PAID", status: { not: "CANCELLED" } },
  });
  const spent = Number(paid._sum.total ?? 0);
  const lastOrder = recentOrders[0] ?? null;

  const stats = [
    { label: "Zamówienia", value: String(totalOrders), sub: totalOrders === 0 ? "jeszcze żadnego" : "łącznie", icon: Package },
    { label: "Wydane w sklepie", value: fmtMoney(spent), sub: "opłacone zamówienia", icon: Wallet },
    {
      label: "Ostatnie zamówienie",
      value: lastOrder ? fmtDate(lastOrder.createdAt) : "–",
      sub: lastOrder ? `#${lastOrder.id.slice(-8).toUpperCase()}` : "czekamy na pierwsze",
      icon: CalendarDays,
    },
  ];

  const tile = "flex items-center gap-4 rounded-xl border p-4 sm:p-5 transition-colors group";

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Statystyki */}
      {/* Na telefonie zwięzłe wiersze (ikona · etykieta · wartość) w jednej
          karcie – trzy wysokie kafelki wymuszały przewijanie; od `sm` kafelki */}
      <div className="sm:hidden rounded-xl bg-cream border border-sand divide-y divide-sand">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-warm-white border border-sand flex items-center justify-center">
              <Icon size={15} strokeWidth={1.5} className="text-clay" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] tracking-widest uppercase text-charcoal/80">{label}</p>
              <p className="text-[11px] text-clay">{sub}</p>
            </div>
            <p className="ml-auto shrink-0 font-serif text-base text-espresso tabular-nums text-right">{value}</p>
          </div>
        ))}
      </div>
      <div className="hidden sm:grid grid-cols-3 gap-4">
        {stats.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-cream border border-sand p-5">
            <span className="w-10 h-10 rounded-full bg-warm-white border border-sand flex items-center justify-center mb-4">
              <Icon size={18} strokeWidth={1.5} className="text-clay" />
            </span>
            <p className="font-serif text-2xl text-espresso leading-none tabular-nums">{value}</p>
            <p className="text-[11px] text-clay mt-1.5">{sub}</p>
            <p className="text-[11px] tracking-widest uppercase text-charcoal/80 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Ostatnie zamówienia */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <ClayRule className="mb-3" />
            <h2 className="font-serif text-2xl text-espresso">Ostatnie zamówienia</h2>
          </div>
          {totalOrders > 3 && (
            <Link
              href="/konto/zamowienia"
              className="text-xs tracking-widest uppercase text-clay hover:text-espresso transition-colors flex items-center gap-1 pb-1"
            >
              Wszystkie <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-xl bg-cream border border-sand px-6 py-10 text-center">
            <span className="mx-auto mb-4 w-14 h-14 rounded-full bg-warm-white border border-sand flex items-center justify-center">
              <ShoppingBag size={22} strokeWidth={1.3} className="text-clay" />
            </span>
            <p className="font-serif text-xl text-espresso mb-2">Nie masz jeszcze zamówień</p>
            <p className="text-sm text-charcoal/80 mb-6">
              Każda rzecz w sklepie powstaje ręcznie – zobacz, co teraz czeka w pracowni.
            </p>
            <Link
              href="/sklep"
              className="inline-flex items-center gap-2 rounded-md bg-clay hover:bg-terracotta hover:text-espresso text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
            >
              Przejdź do sklepu <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/konto/zamowienia/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-xl bg-cream border border-sand hover:border-clay/60 transition-colors p-4 sm:p-5 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="shrink-0 w-10 h-10 rounded-full bg-warm-white border border-sand flex items-center justify-center">
                    <Package size={18} strokeWidth={1.5} className="text-clay" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-espresso">
                      Zamówienie #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-charcoal/80 mt-0.5">
                      {fmtDate(order.createdAt)} · {order.items.length}{" "}
                      {order.items.length === 1 ? "produkt" : order.items.length < 5 ? "produkty" : "produktów"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <OrderStatusBadge status={order.status} />
                  <p className="font-serif text-lg text-espresso hidden sm:block tabular-nums">
                    {fmtMoney(order.total)}
                  </p>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-charcoal/80 group-hover:text-clay transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Skróty */}
      <section>
        <ClayRule className="mb-3" />
        <h2 className="font-serif text-2xl text-espresso mb-5">Na skróty</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/konto/profil" className={`${tile} bg-cream border-sand hover:border-clay/60 text-espresso`}>
            <span className="shrink-0 w-10 h-10 rounded-full bg-warm-white border border-sand flex items-center justify-center">
              <User size={18} strokeWidth={1.5} className="text-clay" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm">Dane i hasło</p>
              <p className="text-xs text-charcoal/80">Imię, e-mail, hasło</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-charcoal/80 group-hover:text-clay group-hover:translate-x-1 transition-all" />
          </Link>
          <Link href="/konto/adres" className={`${tile} bg-cream border-sand hover:border-clay/60 text-espresso`}>
            <span className="shrink-0 w-10 h-10 rounded-full bg-warm-white border border-sand flex items-center justify-center">
              <MapPin size={18} strokeWidth={1.5} className="text-clay" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm">Adres dostawy</p>
              <p className="text-xs text-charcoal/80">Podpowiadany przy zamówieniu</p>
            </div>
            <ChevronRight size={16} className="ml-auto text-charcoal/80 group-hover:text-clay group-hover:translate-x-1 transition-all" />
          </Link>
          <Link href="/sklep" className={`${tile} bg-espresso border-espresso hover:bg-charcoal text-cream sm:col-span-2`}>
            <span className="shrink-0 w-10 h-10 rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center">
              <ShoppingBag size={18} strokeWidth={1.5} className="text-terracotta" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm">Przeglądaj sklep</p>
              <p className="text-xs text-cream/70">Nowe rzeczy z pracowni</p>
            </div>
            <ChevronRight size={16} className="ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>
          {isAdmin && (
            <Link href="/admin" className={`${tile} bg-clay border-clay hover:bg-terracotta hover:text-espresso text-warm-white sm:col-span-2`}>
              <span className="shrink-0 w-10 h-10 rounded-full bg-warm-white/15 border border-warm-white/25 flex items-center justify-center">
                <LayoutDashboard size={18} strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-sm">Panel admina</p>
                <p className="text-xs opacity-80">Zarządzaj sklepem</p>
              </div>
              <ChevronRight size={16} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
