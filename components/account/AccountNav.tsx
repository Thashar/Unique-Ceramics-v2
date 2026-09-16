"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { LayoutDashboard, Package, User, MapPin, LogOut, ChevronDown } from "lucide-react";

const links = [
  { href: "/konto", label: "Przegląd", icon: LayoutDashboard, exact: true },
  { href: "/konto/zamowienia", label: "Moje zamówienia", icon: Package },
  { href: "/konto/profil", label: "Dane i hasło", icon: User },
  { href: "/konto/adres", label: "Adres dostawy", icon: MapPin },
];

/**
 * Nawigacja konta. Od `lg` kolumna po lewej (pozycje jak w menu konta
 * w nagłówku: zaokrąglone, aktywna na kremowym tle z terakotową kropką).
 * Poniżej `lg` – **rozwijane menu**: przycisk z nazwą bieżącej sekcji
 * i strzałką, po stuknięciu lista pozycji. Przewijany w bok rząd (do
 * 16.09.2026) był nieczytelny – nie było widać, że jest tam coś więcej.
 */
export default function AccountNav() {
  const pathname = usePathname();
  // Stan otwarcia związany ze ścieżką: po przejściu na inną sekcję menu
  // składa się samo, bez efektu (wzorzec „stan z propsa”)
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  const current = links.find((l) => isActive(l.href, l.exact)) ?? links[0];
  const CurrentIcon = current.icon;

  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm transition-colors ${
      active
        ? "bg-cream border border-sand text-espresso font-medium"
        : "border border-transparent text-charcoal/80 hover:text-espresso hover:bg-cream"
    }`;

  const list = (onPick?: () => void) => (
    <>
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link key={href} href={href} onClick={onPick} className={item(active)}>
            <Icon size={16} strokeWidth={1.5} className={active ? "text-clay" : ""} />
            {label}
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-terracotta" />}
          </Link>
        );
      })}
      <div className="my-2 border-t border-sand" />
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm text-charcoal/80 hover:text-red-700 hover:bg-red-50 transition-colors text-left"
      >
        <LogOut size={16} strokeWidth={1.5} />
        Wyloguj się
      </button>
    </>
  );

  return (
    <>
      {/* Telefon i tablet: rozwijane menu */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpenFor(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="account-nav-list"
          className="w-full flex items-center gap-3 rounded-xl bg-cream border border-sand px-4 py-3 text-sm text-espresso"
        >
          <CurrentIcon size={16} strokeWidth={1.5} className="text-clay" />
          <span className="font-medium">{current.label}</span>
          <span className="ml-auto text-[11px] tracking-widest uppercase text-charcoal/80">Menu</span>
          <ChevronDown size={16} strokeWidth={1.5} className={`text-charcoal/80 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <nav id="account-nav-list" className="mt-2 flex flex-col gap-1 rounded-xl border border-sand bg-warm-white p-2">
            {list(() => setOpenFor(null))}
          </nav>
        )}
      </div>

      {/* Desktop: kolumna */}
      <nav className="hidden lg:flex flex-col gap-1">{list()}</nav>
    </>
  );
}
