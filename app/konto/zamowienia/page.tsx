import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";

export const metadata = { title: "Moje zamówienia" };

export default async function OrdersPage() {
  const session = await auth();
  const orders = await db.order.findMany({
    where: { userId: session!.user!.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h2 className="font-serif text-2xl text-espresso mb-8">Moje zamówienia</h2>

      {orders.length === 0 ? (
        <div className="bg-cream p-16 text-center">
          <ShoppingBag size={44} strokeWidth={1} className="mx-auto text-sand mb-5" />
          <p className="text-charcoal/60 mb-6">Nie złożyłeś jeszcze żadnego zamówienia.</p>
          <Link
            href="/sklep"
            className="inline-flex items-center gap-2 bg-terracotta hover:bg-clay text-warm-white text-xs tracking-widest uppercase px-6 py-3 transition-colors"
          >
            Przejdź do sklepu
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/konto/zamowienia/${order.id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between bg-cream hover:bg-sand/40 transition-colors p-5 gap-4 group"
            >
              <div className="flex items-start gap-4">
                <Package size={20} strokeWidth={1.5} className="text-clay flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-espresso">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-charcoal/50 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-charcoal/50 mt-1">
                    {order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:flex-shrink-0">
                <OrderStatusBadge status={order.status} />
                <p className="font-serif text-xl text-espresso">
                  {order.total.toLocaleString("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 })}
                </p>
                <ChevronRight size={16} strokeWidth={1.5} className="text-charcoal/30 group-hover:text-clay transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
