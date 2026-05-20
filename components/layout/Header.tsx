"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { ShoppingBag, Menu, X, User, Package, LogOut, ChevronDown } from "lucide-react";

const navLinks = [
  { href: "/sklep", label: "Sklep" },
  { href: "/warsztaty", label: "Warsztaty" },
  { href: "/o-mnie", label: "O mnie" },
  { href: "/kontakt", label: "Kontakt" },
];

function AccountDropdown() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!session) {
    return (
      <Link
        href="/logowanie"
        className="p-2 text-espresso hover:text-clay transition-colors"
        aria-label="Zaloguj się"
      >
        <User size={22} strokeWidth={1.5} />
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-2 text-espresso hover:text-clay transition-colors"
        aria-label="Konto"
      >
        {session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <User size={22} strokeWidth={1.5} />
        )}
        <ChevronDown size={14} strokeWidth={1.5} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-warm-white shadow-lg border border-sand py-2 z-50">
          <div className="px-4 py-2 border-b border-sand mb-1">
            <p className="text-xs font-medium text-espresso truncate">
              {session.user?.name ?? session.user?.email}
            </p>
            <p className="text-xs text-charcoal/40 truncate">{session.user?.email}</p>
          </div>
          <Link
            href="/konto"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/70 hover:text-espresso hover:bg-cream transition-colors"
          >
            <User size={15} strokeWidth={1.5} />
            Moje konto
          </Link>
          <Link
            href="/konto/zamowienia"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/70 hover:text-espresso hover:bg-cream transition-colors"
          >
            <Package size={15} strokeWidth={1.5} />
            Zamówienia
          </Link>
          <div className="border-t border-sand mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/70 hover:text-red-600 hover:bg-red-50 w-full text-left transition-colors"
            >
              <LogOut size={15} strokeWidth={1.5} />
              Wyloguj się
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-warm-white/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-xl tracking-wide text-espresso hover:text-clay transition-colors"
        >
          Unique Ceramics
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-clay transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Koszyk + konto + hamburger */}
        <div className="flex items-center gap-1">
          <Link
            href="/koszyk"
            className="relative p-2 text-espresso hover:text-clay transition-colors"
            aria-label="Koszyk"
          >
            <ShoppingBag size={22} strokeWidth={1.5} />
            <span className="absolute top-1 right-1 w-4 h-4 bg-terracotta text-warm-white text-[10px] rounded-full flex items-center justify-center font-medium leading-none">
              0
            </span>
          </Link>

          <AccountDropdown />

          <button
            className="md:hidden p-2 text-espresso hover:text-clay transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-warm-white/98 backdrop-blur-md border-t border-sand px-6 pb-8 pt-4">
          <nav className="flex flex-col gap-6 mt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-base tracking-widest uppercase text-charcoal hover:text-clay transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/konto"
              onClick={() => setMenuOpen(false)}
              className="text-base tracking-widest uppercase text-charcoal hover:text-clay transition-colors"
            >
              Moje konto
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
