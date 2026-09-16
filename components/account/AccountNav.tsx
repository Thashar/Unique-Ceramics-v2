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

/**
 * Nawigacja konta – pozycje jak w menu konta w nagłówku: zaokrąglone,
 * aktywna na kremowym tle z terakotową kropką. Na telefonie pozycje układają
 * się w przewijany rząd nad treścią, od `lg` w kolumnę po lewej.
 */
export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-cream border border-sand text-espresso font-medium"
                : "border border-transparent text-charcoal/80 hover:text-espresso hover:bg-cream"
            }`}
          >
            <Icon size={16} strokeWidth={1.5} className={active ? "text-clay" : ""} />
            {label}
            {active && <span className="ml-auto hidden lg:block w-1.5 h-1.5 rounded-full bg-terracotta" />}
          </Link>
        );
      })}

      <div className="hidden lg:block my-2 border-t border-sand" />

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm whitespace-nowrap text-charcoal/80 hover:text-red-700 hover:bg-red-50 transition-colors text-left"
      >
        <LogOut size={16} strokeWidth={1.5} />
        Wyloguj się
      </button>
    </nav>
  );
}
