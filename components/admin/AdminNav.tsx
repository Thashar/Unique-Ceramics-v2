"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, ClipboardList,
  Settings, LogOut, Menu, X, ChevronDown, ChevronRight,
} from "lucide-react";

const topLinks = [
  { href: "/admin",                         label: "Dashboard",         icon: LayoutDashboard },
  { href: "/admin/produkty",                label: "Produkty",          icon: Package },
  { href: "/admin/zamowienia",              label: "Zamówienia",        icon: ShoppingBag },
  { href: "/admin/zamowienia-indywidualne", label: "Zam. indywidualne", icon: ClipboardList },
];

const settingsItems = [
  { id: "omnie",     label: "O mnie" },
  { id: "warsztaty", label: "Warsztaty" },
  { id: "regulamin", label: "Regulamin" },
  { id: "polityka",  label: "Polityka prywatności" },
  { id: "kontakt",   label: "Kontakt" },
  { id: "wysylka",   label: "Wysyłka" },
];

const paymentItems = [
  { id: "platnosci_przelew", label: "Przelew tradycyjny" },
  { id: "platnosci_blik",    label: "BLIK" },
  { id: "platnosci_p24",     label: "Przelewy24" },
  { id: "platnosci_payu",    label: "PayU" },
];

function AdminNavInner({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("s") ?? "omnie";

  const onSettings = pathname.startsWith("/admin/ustawienia");
  const onPayments = activeSection.startsWith("platnosci_");

  const [paymentsOpen, setPaymentsOpen] = useState(onPayments);

  return (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {topLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors ${
                active ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}

        {/* Ustawienia — rozwijane */}
        <div>
          <Link
            href="/admin/ustawienia?s=omnie"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors ${
              onSettings ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Settings size={16} strokeWidth={1.5} />
            <span className="flex-1">Ustawienia</span>
            {onSettings
              ? <ChevronDown size={13} className="opacity-60" />
              : <ChevronRight size={13} className="opacity-40" />}
          </Link>

          {onSettings && (
            <div className="mt-0.5 ml-3 border-l border-white/15 pl-3 space-y-0.5">
              {settingsItems.map(({ id, label }) => (
                <Link
                  key={id}
                  href={`/admin/ustawienia?s=${id}`}
                  onClick={onClose}
                  className={`block px-2 py-1.5 text-xs rounded transition-colors ${
                    activeSection === id
                      ? "text-white bg-white/15"
                      : "text-white/55 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              ))}

              {/* Płatności — druga warstwa */}
              <button
                onClick={() => setPaymentsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded transition-colors text-white/55 hover:text-white hover:bg-white/10"
              >
                <span className={onPayments ? "text-white" : ""}>Płatności</span>
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
                      className={`block px-2 py-1.5 text-xs rounded transition-colors ${
                        activeSection === id
                          ? "text-white bg-white/15"
                          : "text-white/55 hover:text-white hover:bg-white/10"
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

      <div className="p-4 border-t border-white/10">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Wróć do sklepu
        </Link>
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
        <div className="p-6 border-b border-white/10">
          <p className="font-serif text-lg uppercase">Unique Ceramics</p>
          <p className="text-xs text-white/40 mt-0.5">Panel admina</p>
        </div>
        <Suspense fallback={null}>
          <AdminNavInner />
        </Suspense>
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

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

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
        <Suspense fallback={null}>
          <AdminNavInner onClose={() => setOpen(false)} />
        </Suspense>
      </aside>
    </>
  );
}
