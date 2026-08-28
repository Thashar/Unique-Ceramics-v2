"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ShoppingBag, Menu, X, User, Package, LogOut, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/lib/cart";

// Dystans (px) zjazdu poniżej górnej krawędzi stopki, na którym header
// płynnie zanika do zera – dobrany tak, by zniknął zanim zacznie zasłaniać
// treść (stopka ma pt-20, czyli 80 px zapasu pod headerem).
const FADE_DISTANCE = 150;

// Wysokość headera (h-20) i baneru urlopowego (h-5) – muszą zgadzać się
// z klasami w JSX; służą do wyliczenia --header-offset.
const HEADER_H = 80;
const VACATION_BANNER_H = 20;

// Auto-chowanie na mobile: minimalny ruch, który uznajemy za przewijanie,
// oraz pozycja, poniżej której wolno schować header.
const SCROLL_DELTA = 8;
const HIDE_AFTER = 120;

// Kontrolne przeliczenia przezroczystości po wejściu na stronę główną (ms).
// Zabezpieczenie przed wyścigiem: gdyby pierwszy pomiar trafił w moment
// niegotowego układu, stan naprawia się sam, bez czekania na przewinięcie.
const RECHECK_DELAYS = [400, 1200, 2500];

const ALL_NAV_LINKS = [
  { href: "/sklep",         label: "Sklep",          always: true  },
  { href: "/o-mnie",        label: "O mnie",          always: true  },
  { href: "/moje-projekty", label: "Moje projekty",   always: false },
  { href: "/warsztaty",     label: "Warsztaty",       always: true  },
  { href: "/kontakt",       label: "Kontakt",         always: true  },
];

function AccountDropdown({ scrolled }: { scrolled: boolean }) {
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

  const iconClass = `transition-colors duration-500 ${
    scrolled ? "text-cream hover:text-terracotta" : "text-cream hover:text-sand"
  }`;

  if (!session) {
    return (
      <Link href="/logowanie" className={`p-2 ${iconClass}`} aria-label="Zaloguj się">
        <User size={22} strokeWidth={1.5} />
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 p-2 ${iconClass}`}
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
            <p className="text-xs text-charcoal/80 truncate">{session.user?.email}</p>
          </div>
          <Link
            href="/konto"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/80 hover:text-espresso hover:bg-cream transition-colors"
          >
            <User size={15} strokeWidth={1.5} />
            Moje konto
          </Link>
          <Link
            href="/konto/zamowienia"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/80 hover:text-espresso hover:bg-cream transition-colors"
          >
            <Package size={15} strokeWidth={1.5} />
            Zamówienia
          </Link>
          <div className="border-t border-sand mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/80 hover:text-red-700 hover:bg-red-50 w-full text-left transition-colors"
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

export default function Header({ topOffset = false, showProjects = true }: { topOffset?: boolean; showProjects?: boolean }) {
  // Na homepage header jest przezroczysty gdy widoczna sekcja z ciemnym tłem
  // (Hero, O mnie, Warsztaty). W pozostałych sekcjach i na innych stronach – solid.
  const [transparentVisible, setTransparentVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // Auto-chowanie na mobile przy przewijaniu w dół (podstrony)
  const [hidden, setHidden] = useState(false);
  const { count } = useCart();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const headerRef = useRef<HTMLElement>(null);
  const menuOpenRef = useRef(menuOpen);
  const scheduleRef = useRef<() => void>(() => {});

  // Wzorzec "reset stanu przy zmianie props/pochodnych" – setState podczas renderowania
  // (nie w efekcie) jest dozwolony wg React docs i nie triggeruje cascading renders.
  const [prevIsHome, setPrevIsHome] = useState(isHome);
  if (prevIsHome !== isHome) {
    setPrevIsHome(isHome);
    if (isHome) setTransparentVisible(true);
  }

  const navLinks = ALL_NAV_LINKS.filter((l) => l.always || showProjects);
  const dark = !isHome || !transparentVisible;
  // Schowany tylko gdy menu mobilne jest zamknięte – inaczej nie dałoby się go zamknąć
  const collapsed = hidden && !menuOpen;

  // Zamknij menu mobilne klawiszem Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!isHome) return;

    let raf = 0;
    let retries = 0;
    const mobileMq = window.matchMedia("(max-width: 1023px)");
    const headerNode = headerRef.current;

    function measure() {
      const sections = document.querySelectorAll<HTMLElement>('[data-header-theme="transparent"]');

      // Sekcji może jeszcze nie być w DOM (hydratacja / strumieniowany HTML).
      // Nie wolno wtedy zgadywać na ciemny header – strona główna zaczyna się
      // od jasnej sekcji (Hero), więc zostajemy przy przezroczystym i ponawiamy
      // pomiar w kolejnych klatkach, aż układ będzie gotowy (~1,5 s).
      if (sections.length === 0) {
        if (retries++ < 90) raf = requestAnimationFrame(measure);
        return;
      }
      retries = 0;

      let visible = false;
      for (const el of sections) {
        const rect = el.getBoundingClientRect();
        const vis = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        if (el.offsetHeight && vis / el.offsetHeight >= 0.3) { visible = true; break; }
      }
      setTransparentVisible(visible);
      fade();
    }

    // Zanikanie headera po zjechaniu poniżej „punktu zero" stopki (jej górnej
    // krawędzi), żeby nie zasłaniał treści stopki; przy powrocie w górę
    // pojawia się tą samą drogą. Wyłącznie na urządzeniach mobilnych – od `lg`
    // stopka ma dokładnie jeden ekran i header nie ma czego zasłaniać.
    // Przezroczystość ustawiamy prosto na węźle DOM (bez setState), bo wartość
    // zmienia się w każdej klatce przewijania.
    function fade() {
      const node = headerRef.current;
      if (!node) return;

      const target = document.querySelector<HTMLElement>("[data-header-fade]");
      let opacity = 1;
      if (target && mobileMq.matches && !menuOpenRef.current) {
        const past = -target.getBoundingClientRect().top;
        if (past > 0) opacity = Math.max(0, 1 - past / FADE_DISTANCE);
      }

      node.style.opacity = String(opacity);
      node.style.pointerEvents = opacity < 0.05 ? "none" : "";
    }

    // Pomiar zawsze w kolejnej klatce – po ustabilizowaniu układu, nie w trakcie
    // zdarzenia (chroni przed odczytem rect-a sprzed programowego scrolla).
    function schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    }

    scheduleRef.current = schedule;
    schedule();

    // scroll – zwykłe przewijanie
    // resize / orientationchange – zmiana wysokości viewportu (zwijanie paska
    //   adresu na mobile, obrót ekranu, zmiana rozmiaru okna)
    // pageshow – powrót z bfcache (wejście „wstecz" z zewnętrznej strony)
    // load – układ ustabilizowany po wczytaniu zasobów; łapie też wymuszony
    //   przez HomeScrollSnap powrót na górę strony po przywróceniu scrolla
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("pageshow", schedule);
    if (document.readyState !== "complete") window.addEventListener("load", schedule);

    // Pomiary kontrolne po starcie. Bez nich błędny odczyt (np. gdy układ nie
    // był jeszcze gotowy) utrzymywał się aż do pierwszego przewinięcia —
    // użytkownik widział ciemny header nad hero i nic go nie naprawiało.
    const recheck = RECHECK_DELAYS.map((ms) => window.setTimeout(schedule, ms));

    return () => {
      cancelAnimationFrame(raf);
      for (const id of recheck) clearTimeout(id);
      scheduleRef.current = () => {};
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);
      window.removeEventListener("load", schedule);
      // Poza stroną główną header musi być w pełni widoczny
      if (headerNode) {
        headerNode.style.opacity = "";
        headerNode.style.pointerEvents = "";
      }
    };
  }, [isHome]);

  // Otwarte menu mobilne zawsze w pełni widoczne – nawet gdy jesteśmy w stopce
  useEffect(() => {
    menuOpenRef.current = menuOpen;
    scheduleRef.current();
  }, [menuOpen]);

  // Auto-chowanie headera na urządzeniach mobilnych: przewijanie w dół chowa,
  // w górę wyłania. Strona główna ma własny scroll-snap i zanikanie w stopce,
  // więc jej to nie dotyczy.
  useEffect(() => {
    if (isHome) return;

    const mobileMq = window.matchMedia("(max-width: 1023px)");
    let lastY = window.scrollY;
    let raf = 0;

    function evaluate() {
      if (!mobileMq.matches) { setHidden(false); return; }

      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      // Próg wygasza drobne drgania (m.in. zwijanie paska adresu na mobile)
      if (Math.abs(delta) < SCROLL_DELTA) return;
      lastY = y;
      // Blisko góry strony header zostaje widoczny – chowamy dopiero gdy
      // pasek kategorii w /sklep zdążył się przykleić
      setHidden(delta > 0 && y > HIDE_AFTER);
    }

    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(evaluate);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isHome]);

  // --header-offset: gdzie mają się przyklejać elementy pod headerem
  // (pasek kategorii w /sklep). Schowany header = zostaje sam baner urlopowy.
  useEffect(() => {
    const bannerH = topOffset ? VACATION_BANNER_H : 0;
    const root = document.documentElement;
    root.style.setProperty(
      "--header-offset",
      `${collapsed ? bannerH : bannerH + HEADER_H}px`
    );
    return () => { root.style.removeProperty("--header-offset"); };
  }, [collapsed, topOffset]);

  return (
    <>
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    <header
      ref={headerRef}
      className={`fixed ${topOffset ? "top-5" : "top-0"} left-0 right-0 z-50 ${
        dark || menuOpen
          ? "bg-espresso shadow-sm"
          : "bg-transparent"
      }`}
      // Przejścia inline, bo każde ma inny czas: wsuwanie/wysuwanie ma być
      // szybkie, a zmiana tła na stronie głównej łagodna. Przezroczystość
      // celowo poza listą – w stopce sterujemy nią pozycją scrolla, klatka
      // po klatce, i każde przejście by ją opóźniało.
      style={{
        transform: collapsed ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 300ms ease, background-color 500ms, box-shadow 500ms",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Image
            src="/images/logo.webp"
            alt="Unique Ceramics"
            width={40}
            height={40}
            className="h-9 w-auto transition-all duration-500 brightness-0 invert"
          />
          {/* Napis ma być **dokładnie w kolorze logo** – czysta biel, w obu
              stanach headera i bez przygaszania przezroczystością. Wcześniej
              nad jasnymi sekcjami szedł `text-cream` (ciepła kość słoniowa),
              co obok białego logo czytało się jako brudny, kawowy odcień,
              a `/70` na podtytule dawało wrażenie szarej obwódki.
              Logo nie zmienia koloru na hoverze, więc napis też nie. */}
          <div className="flex flex-col leading-none pt-1.5">
            <span className="font-serif text-base sm:text-lg font-semibold tracking-wide text-white">
              Unique Ceramics
            </span>
            <span className="text-[6.5px] tracking-[0.18em] uppercase mt-0.5 text-white">
              Ręcznie tworzone z sercem
            </span>
          </div>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative pb-1 text-sm tracking-widest uppercase transition-colors duration-300 ${
                  dark
                    ? isActive ? "text-terracotta" : "text-cream/75 hover:text-cream"
                    : isActive ? "text-cream" : "text-cream/75 hover:text-cream"
                }`}
              >
                {link.label}
                {/* Animowany podkreślnik */}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-px transition-transform duration-300 origin-left ${
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  } ${dark ? "bg-terracotta" : "bg-cream/60"}`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Koszyk + konto + hamburger */}
        <div className="flex items-center gap-1">
          <Link
            href="/koszyk"
            className={`relative p-2 transition-colors duration-500 ${
              dark ? "text-cream hover:text-terracotta" : "text-cream hover:text-sand"
            }`}
            aria-label="Koszyk"
          >
            <ShoppingBag size={22} strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-terracotta text-espresso text-[10px] rounded-full flex items-center justify-center font-medium leading-none">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>

          <AccountDropdown scrolled={dark} />

          <button
            className={`md:hidden p-2 transition-colors duration-500 ${
              dark ? "text-cream hover:text-terracotta" : "text-cream hover:text-sand"
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            id="mobile-nav"
            role="dialog"
            aria-label="Menu nawigacyjne"
            className="md:hidden bg-espresso border-t border-white/10 px-6 pb-8 pt-4"
          >
            <nav className="flex flex-col gap-1 mt-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`py-3 border-b border-white/10 text-base tracking-widest uppercase transition-colors ${
                      isActive ? "text-terracotta" : "text-cream/75 hover:text-cream"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/konto"
                onClick={() => setMenuOpen(false)}
                className="py-3 text-base tracking-widest uppercase text-cream/75 hover:text-cream transition-colors"
              >
                Moje konto
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
}
