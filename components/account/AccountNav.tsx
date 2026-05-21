"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Package, User, MapPin, LogOut } from "lucide-react";

const links = [
  { href: "/konto", label: "Przegląd", icon: LayoutDashboard, exact: true },
  { href: "/konto/zamowienia", label: "Moje zamówienia", icon: Package },
  { href: "/konto/profil", label: "Dane i hasło", icon: User },
  { href: "/konto/adres", label: "Adres dostawy", icon: MapPin },
];

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active
                ? "bg-cream text-espresso font-medium border-l-2 border-terracotta"
                : "text-charcoal/60 hover:text-espresso hover:bg-mist"
            }`}
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-sand" />

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-3 px-4 py-3 text-sm text-charcoal/60 hover:text-red-600 hover:bg-red-50 transition-colors text-left"
      >
        <LogOut size={16} strokeWidth={1.5} />
        Wyloguj się
      </button>
    </nav>
  );
}
