"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, ClipboardList,
  Settings, LogOut, Menu, X,
} from "lucide-react";

const navLinks = [
  { href: "/admin",                          label: "Dashboard",          icon: LayoutDashboard },
  { href: "/admin/produkty",                 label: "Produkty",           icon: Package },
  { href: "/admin/zamowienia",               label: "Zamówienia",         icon: ShoppingBag },
  { href: "/admin/zamowienia-indywidualne",  label: "Zam. indywidualne",  icon: ClipboardList },
  { href: "/admin/ustawienia",               label: "Ustawienia",         icon: Settings },
];

export default function AdminNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const NavLinks = () => (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Wróć do sklepu
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-espresso text-warm-white flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-white/10">
          <p className="font-serif text-lg uppercase">Unique Ceramics</p>
          <p className="text-xs text-white/40 mt-0.5">Panel admina</p>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-espresso text-warm-white flex items-center justify-between px-4 h-14 border-b border-white/10">
        <p className="font-serif text-base uppercase">Unique Ceramics</p>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Menu"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-espresso text-warm-white flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-serif text-base uppercase">Unique Ceramics</p>
            <p className="text-xs text-white/40 mt-0.5">Panel admina</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
            aria-label="Zamknij"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
