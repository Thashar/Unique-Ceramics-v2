"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X } from "lucide-react";

const navLinks = [
  { href: "/sklep", label: "Sklep" },
  { href: "/warsztaty", label: "Warsztaty" },
  { href: "/o-mnie", label: "O mnie" },
  { href: "/kontakt", label: "Kontakt" },
];

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

        {/* Koszyk + hamburger */}
        <div className="flex items-center gap-4">
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
          </nav>
        </div>
      )}
    </header>
  );
}
