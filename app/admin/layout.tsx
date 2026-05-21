import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, ClipboardList, Settings, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || session.user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-[100svh] bg-warm-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-espresso text-warm-white flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-white/10">
          <p className="font-serif text-lg">Unique Ceramics</p>
          <p className="text-xs text-white/40 mt-0.5">Panel admina</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/produkty", label: "Produkty", icon: Package },
            { href: "/admin/zamowienia", label: "Zamówienia", icon: ShoppingBag },
            { href: "/admin/zamowienia-indywidualne", label: "Zam. indywidualne", icon: ClipboardList },
            { href: "/admin/ustawienia", label: "Ustawienia", icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Wróć do sklepu
          </Link>
        </div>
      </aside>

      {/* Treść */}
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  );
}
