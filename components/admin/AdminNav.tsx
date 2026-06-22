"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, ClipboardList,
  Settings, LogOut, Menu, X, ChevronDown, ChevronRight, ExternalLink, Tag,
  GalleryHorizontal,
} from "lucide-react";

const topLinks = [
  { href: "/admin",                         label: "Dashboard",         icon: LayoutDashboard },
  { href: "/admin/kategorie",               label: "Kategorie",         icon: Tag },
  { href: "/admin/produkty",                label: "Produkty",          icon: Package },
  { href: "/admin/projekty",                label: "Projekty",          icon: GalleryHorizontal },
  { href: "/admin/zamowienia",              label: "Zamówienia",        icon: ShoppingBag },
  { href: "/admin/zamowienia-indywidualne", label: "Zam. indywidualne", icon: ClipboardList },
];

const settingsItems = [
  { id: "strona_glowna", label: "Strona główna" },
  { id: "omnie",     label: "O mnie" },
  { id: "sklep",     label: "Sklep" },
  { id: "warsztaty", label: "Warsztaty" },
  { id: "regulamin", label: "Regulamin" },
  { id: "polityka",  label: "Polityka prywatności" },
  { id: "kontakt",   label: "Kontakt" },
  { id: "wysylka",   label: "Wysyłka" },
  { id: "urlop",     label: "Urlop" },
];

const paymentItems = [
  { id: "platnosci_przelew",  label: "Przelew / BLIK" },
  { id: "platnosci_stripe",   label: "Stripe (karta)" },
];

function AdminNavInner({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("s") ?? "strona_glowna";

  const onSettings = pathname.startsWith("/admin/ustawienia");
  const onPayments = activeSection.startsWith("platnosci_");
  const [paymentsOpen, setPaymentsOpen] = useState(onPayments);

  return (
    <>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {topLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 ${
                active
                  ? "bg-white/12 text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-terracotta" />}
            </Link>
          );
        })}

        {/* Ustawienia — rozwijane */}
        <div className="pt-1">
          <Link
            href="/admin/ustawienia?s=strona_glowna"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 ${
              onSettings
                ? "bg-white/12 text-white font-medium"
                : "text-white/60 hover:text-white hover:bg-white/8"
            }`}
          >
            <Settings size={16} strokeWidth={onSettings ? 2 : 1.5} />
            <span className="flex-1">Ustawienia</span>
            {onSettings
              ? <ChevronDown size={13} className="opacity-70" />
              : <ChevronRight size={13} className="opacity-40" />}
          </Link>

          {onSettings && (
            <div className="mt-0.5 ml-4 border-l border-white/10 pl-3 space-y-0.5">
              {settingsItems.map(({ id, label }) => (
                <Link
                  key={id}
                  href={`/admin/ustawienia?s=${id}`}
                  onClick={onClose}
                  className={`block px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    activeSection === id
                      ? "text-white bg-white/12 font-medium"
                      : "text-white/50 hover:text-white hover:bg-white/8"
                  }`}
                >
                  {label}
                </Link>
              ))}

              {/* Płatności — druga warstwa */}
              <button
                onClick={() => setPaymentsOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                  onPayments
                    ? "text-white bg-white/12 font-medium"
                    : "text-white/50 hover:text-white hover:bg-white/8"
                }`}
              >
                <span>Płatności</span>
                {paymentsOpen
                  ? <ChevronDown size={11} className="opacity-60" />
                  : <ChevronRight size={11} className="opacity-40" />}
              </button>

              {paymentsOpen && (
                <div className="ml-2 border-l border-white/10 pl-2 space-y-0.5">
                  {paymentItems.map(({ id, label }) => (
                    <Link
                      key={id}
                      href={`/admin/ustawienia?s=${id}`}
                      onClick={onClose}
                      className={`block px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                        activeSection === id
                          ? "text-white bg-white/12 font-medium"
                          : "text-white/50 hover:text-white hover:bg-white/8"
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="p-3 space-y-0.5 border-t border-white/8">
        <Link
          href="/"
          target="_blank"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-xs text-white/35 hover:text-white/65 transition-colors rounded-lg hover:bg-white/5"
        >
          <ExternalLink size={14} strokeWidth={1.5} />
          Otwórz sklep
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/35 hover:text-white/65 transition-colors rounded-lg hover:bg-white/5"
        >
          <LogOut size={14} strokeWidth={1.5} />
          Wyloguj się
        </button>
      </div>
    </>
  );
}

export default function AdminNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-espresso text-warm-white flex-col fixed inset-y-0 left-0 z-40">
        <div className="px-5 py-6 border-b border-white/8">
          <p className="font-serif text-base tracking-wide text-white">Unique Ceramics</p>
          <p className="text-[10px] text-white/30 mt-0.5 tracking-widest uppercase">Panel administracyjny</p>
        </div>
        <Suspense fallback={null}>
          <AdminNavInner />
        </Suspense>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-espresso text-warm-white flex items-center justify-between px-4 h-14 border-b border-white/10">
        <p className="font-serif text-base tracking-wide">Unique Ceramics</p>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Menu"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-espresso text-warm-white flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-serif text-base tracking-wide text-white">Unique Ceramics</p>
            <p className="text-[10px] text-white/30 mt-0.5 tracking-widest uppercase">Panel admina</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
            aria-label="Zamknij"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <Suspense fallback={null}>
          <AdminNavInner onClose={() => setOpen(false)} />
        </Suspense>
      </aside>
    </>
  );
}
