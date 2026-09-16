"use client";

// Dymki w nagłówku (desktop): najechanie na koszyk pokazuje jego zawartość,
// najechanie na ikonę osoby – menu konta (zalogowany) albo formularz
// logowania (gość). Kliknięcie ikony nadal prowadzi tam, gdzie dotąd
// (`/koszyk`, `/konto`, `/logowanie`), więc na telefonie – gdzie hovera nie ma
// – nic się nie zmienia; dymki otwierają się tylko przy `(hover: hover)`
// i od szerokości `md`.
//
// Otwieranie: `mouseenter` na wrapperze (ikona + panel), zamykanie z opóźnieniem
// 180 ms po `mouseleave`, żeby przejście kursorem z ikony na panel przez
// odstęp nie zamykało dymka (odstęp jest częścią panelu – `pt-3`, nie `mt-3`).
// Escape i klik poza dymkiem zamykają go od razu; fokus klawiaturą na ikonie
// otwiera (dostępność).

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, User, Package, LogOut, Trash2, Eye, EyeOff, Loader2, ArrowRight, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart";
import GoogleIcon from "@/components/ui/GoogleIcon";

const CLOSE_DELAY_MS = 180;
const HOVER_QUERY = "(hover: hover) and (min-width: 768px)";

// Naraz może być otwarty tylko jeden dymek. Ikony stoją obok siebie, więc
// przy przejściu kursorem z koszyka na konto opóźnione zamykanie (180 ms)
// zostawiało oba otwarte i nachodziły na siebie – otwierany dymek zamyka
// więc pozostałe od razu, bez czekania na ich zegar
const closers = new Set<() => void>();
function closeOthers(mine: () => void) {
  for (const close of closers) if (close !== mine) close();
}

function fmt(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} zł`;
}

// ── Wspólny dymek ────────────────────────────────────────────────────────────

function HoverPopover({
  trigger,
  label,
  children,
  width = "w-80",
  forceClose,
}: {
  trigger: ReactNode;
  label: string;
  children: ReactNode;
  width?: string;
  /** Rosnący licznik – każda zmiana zamyka dymek (po nawigacji, po zalogowaniu). */
  forceClose?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canHover = () => typeof window !== "undefined" && window.matchMedia(HOVER_QUERY).matches;

  // Natychmiastowe zamknięcie – rejestrowane w `closers`, żeby inny dymek
  // mógł je wywołać przy swoim otwarciu
  const closeNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }, []);

  useEffect(() => {
    closers.add(closeNow);
    return () => { closers.delete(closeNow); };
  }, [closeNow]);

  const show = useCallback(() => {
    if (!canHover()) return;
    if (timer.current) clearTimeout(timer.current);
    closeOthers(closeNow);
    setOpen(true);
  }, [closeNow]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Zamknięcie na żądanie rodzica (np. po zalogowaniu): wzorzec „stan
  // wyprowadzony z propsa” – porównanie przy renderze zamiast setState
  // w efekcie (reguła `react-hooks/set-state-in-effect`)
  const [seenForce, setSeenForce] = useState(forceClose);
  if (forceClose !== seenForce) {
    setSeenForce(forceClose);
    setOpen(false);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) hide();
      }}
    >
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.18 } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            role="dialog"
            aria-label={label}
            // `pt-3` zamiast `mt-3`: odstęp od ikony jest częścią panelu, więc
            // kursor przechodzący przez niego nie wywołuje `mouseleave`
            className={`absolute right-0 top-full pt-3 ${width} z-50`}
          >
            {/* Dymek jak kafelek: zaokrąglone rogi, dziobek pod ikoną, pas szkliwa
                u góry (terakota → glina → piasek) i ciepły, miękki cień. Reszta
                strony jest kanciasta, ale okienko „przyklejone” do ikony ma
                wyglądać jak coś podanego do ręki, nie jak systemowe menu */}
            <div className="relative">
              <span
                aria-hidden="true"
                // Piaskowy jak prawy koniec pasa szkliwa pod nim – dziobek wygląda
                // jak uniesiony fragment tego pasa, nie jak doklejony trójkąt
                className="absolute -top-[6px] right-[15px] w-3 h-3 rotate-45 bg-sand rounded-[2px] z-10"
              />
              <div className="overflow-hidden rounded-2xl border border-sand bg-warm-white text-charcoal shadow-[0_22px_48px_-18px_rgba(44,40,37,0.45),0_4px_14px_-6px_rgba(44,40,37,0.25)]">
                <div aria-hidden="true" className="h-1 bg-gradient-to-r from-terracotta via-clay to-sand" />
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Nagłówek dymka ───────────────────────────────────────────────────────────

/** Kafelki szkliwa jak w `ClayRule`, tylko krótsze (5 kolumn) – do wąskiego nagłówka. */
const HEADING_TILES = [
  "bg-terracotta", "bg-clay/55", "bg-sand", "bg-terracotta/60", "bg-clay",
  "bg-sand/80", "bg-terracotta/80", "bg-clay/45", "bg-sand", "bg-terracotta/55",
];

function PopoverHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="px-4 pt-3.5 pb-3 border-b border-sand flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid grid-rows-2 gap-[2px] shrink-0"
        style={{ gridTemplateColumns: "repeat(5, 0.5rem)" }}
      >
        {HEADING_TILES.map((tile, i) => (
          <span key={i} className={`w-2 h-2 rounded-[1px] ${tile}`} />
        ))}
      </span>
      <span className="font-serif text-base text-espresso leading-none">{title}</span>
      {aside && <span className="ml-auto text-xs text-charcoal/80">{aside}</span>}
    </div>
  );
}

// ── Koszyk ───────────────────────────────────────────────────────────────────

/** Ile pozycji pokazać w dymku – reszta pod przewijaniem. */
const CART_VISIBLE_ROWS = 4;

export function CartPopover({ iconClass }: { iconClass: string }) {
  const { items, count, subtotal, removeItem, updateQuantity } = useCart();
  const [forceClose, setForceClose] = useState(0);
  const close = () => setForceClose((n) => n + 1);

  const trigger = (
    <Link href="/koszyk" className={`relative block p-2 ${iconClass}`} aria-label="Koszyk" onClick={close}>
      <ShoppingBag size={22} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-terracotta text-espresso text-[10px] rounded-full flex items-center justify-center font-medium leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );

  return (
    <HoverPopover trigger={trigger} label="Zawartość koszyka" width="w-[22rem]" forceClose={forceClose}>
      {items.length === 0 ? (
        <>
          <PopoverHeading title="Twój koszyk" />
          <div className="px-5 pt-5 pb-5 text-center">
            <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-cream border border-sand flex items-center justify-center">
              <ShoppingBag size={20} strokeWidth={1.4} className="text-clay" />
            </span>
            <p className="font-serif text-lg text-espresso">Koszyk jest pusty</p>
            <p className="text-xs text-charcoal/80 mt-1.5 mb-4 leading-relaxed">
              Każda rzecz powstaje ręcznie – zobacz, co teraz czeka w pracowni.
            </p>
            <Link
              href="/sklep"
              onClick={close}
              className="flex items-center justify-center gap-2 rounded-md bg-clay text-warm-white text-xs tracking-widest uppercase py-2.5 hover:bg-terracotta hover:text-espresso transition-colors"
            >
              Przejdź do sklepu <ArrowRight size={13} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <PopoverHeading title="Twój koszyk" aside={`${count} szt.`} />
          <ul
            className="divide-y divide-sand overflow-y-auto"
            style={{ maxHeight: `${CART_VISIBLE_ROWS * 5.25}rem` }}
          >
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/sklep/${item.slug}`} onClick={close} className="shrink-0 w-12 h-12 bg-cream overflow-hidden rounded-lg">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/sklep/${item.slug}`}
                    onClick={close}
                    className="block text-sm text-espresso truncate hover:text-clay transition-colors"
                  >
                    {item.name}
                  </Link>
                  {/* Licznik ilości jak w koszyku, tylko niższy; cena to kwota pozycji */}
                  <div className="flex items-center gap-2.5 mt-1">
                    <div className="flex items-center rounded-md border border-sand">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-charcoal hover:text-clay transition-colors"
                        aria-label={`Zmniejsz ilość: ${item.name}`}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-6 h-6 flex items-center justify-center text-charcoal hover:text-clay disabled:text-sand disabled:cursor-not-allowed transition-colors"
                        aria-label={`Zwiększ ilość: ${item.name}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-charcoal/80 tabular-nums">
                      {fmt(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="shrink-0 p-1.5 text-charcoal/80 hover:text-red-700 transition-colors"
                  aria-label={`Usuń ${item.name} z koszyka`}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-sand">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-charcoal">Razem</span>
              <span className="font-serif text-lg text-espresso tabular-nums">{fmt(subtotal)}</span>
            </div>
            <p className="text-[11px] text-charcoal/80 mb-3">Koszt dostawy zależy od metody wybranej w zamówieniu.</p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/koszyk"
                onClick={close}
                className="text-center rounded-md border border-clay text-clay text-xs tracking-widest uppercase py-2.5 hover:bg-cream transition-colors"
              >
                Koszyk
              </Link>
              <Link
                href="/zamowienie"
                onClick={close}
                className="text-center rounded-md bg-clay text-warm-white text-xs tracking-widest uppercase py-2.5 hover:bg-terracotta hover:text-espresso transition-colors"
              >
                Do kasy
              </Link>
            </div>
          </div>
        </>
      )}
    </HoverPopover>
  );
}

// ── Konto / logowanie ────────────────────────────────────────────────────────

function LoginForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Nieprawidłowy e-mail lub hasło.");
      setLoading(false);
      return;
    }
    // Zostajemy na bieżącej stronie – sesja i koszyk konta dociągną się po odświeżeniu
    onDone();
    router.refresh();
  }

  const input = "w-full rounded-md bg-cream border border-sand focus:border-clay outline-none px-3 py-2.5 text-sm text-espresso transition-colors";

  return (
    <form onSubmit={submit}>
      <PopoverHeading title="Zaloguj się" />
      <div className="p-4 space-y-3">
      {error && <p className="text-xs text-red-700">{error}</p>}
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={input}
        aria-label="E-mail"
      />
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${input} pr-10`}
          aria-label="Hasło"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-charcoal/80 hover:text-espresso"
          aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
        >
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-clay text-warm-white text-xs tracking-widest uppercase py-2.5 hover:bg-terracotta hover:text-espresso transition-colors disabled:opacity-60"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Zaloguj
      </button>
      {/* Google pod przyciskiem logowania (decyzja właściciela 16.09.2026) –
          inaczej niż na /logowanie, gdzie stoi na górze */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sand" /></div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-charcoal/80">
          <span className="bg-warm-white px-2">lub</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => { setLoading(true); signIn("google", { callbackUrl: window.location.pathname }); }}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 rounded-md border border-sand hover:border-clay bg-warm-white hover:bg-cream text-espresso text-sm py-2.5 transition-colors disabled:opacity-60"
      >
        <GoogleIcon className="w-4 h-4" />
        Kontynuuj z Google
      </button>
      <p className="text-[11px] text-charcoal/80 text-center pt-1">
        Nie masz konta?{" "}
        <Link href="/rejestracja" onClick={onDone} className="text-clay hover:text-espresso underline underline-offset-2">
          Zarejestruj się
        </Link>
      </p>
      </div>
    </form>
  );
}

export function AccountPopover({ iconClass }: { iconClass: string }) {
  const { data: session } = useSession();
  const [forceClose, setForceClose] = useState(0);
  const close = () => setForceClose((n) => n + 1);

  if (!session) {
    const trigger = (
      <Link href="/logowanie" className={`block p-2 ${iconClass}`} aria-label="Zaloguj się" onClick={close}>
        <User size={22} strokeWidth={1.5} />
      </Link>
    );
    return (
      <HoverPopover trigger={trigger} label="Logowanie" width="w-72" forceClose={forceClose}>
        <LoginForm onDone={close} />
      </HoverPopover>
    );
  }

  const trigger = (
    <Link href="/konto" className={`flex items-center p-2 ${iconClass}`} aria-label="Konto" onClick={close}>
      {session.user?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={session.user.image} alt="" className="w-6 h-6 rounded-full object-cover" />
      ) : (
        <User size={22} strokeWidth={1.5} />
      )}
    </Link>
  );

  const row = "flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/80 hover:text-espresso hover:bg-cream transition-colors";

  return (
    <HoverPopover trigger={trigger} label="Konto" width="w-56" forceClose={forceClose}>
      <div className="pb-2">
        <PopoverHeading title={session.user?.name ?? "Moje konto"} />
        <p className="px-4 pt-2.5 pb-1 text-xs text-charcoal/80 truncate">{session.user?.email}</p>
        <Link href="/konto" onClick={close} className={row}>
          <User size={15} strokeWidth={1.5} />
          Moje konto
        </Link>
        <Link href="/konto/zamowienia" onClick={close} className={row}>
          <Package size={15} strokeWidth={1.5} />
          Zamówienia
        </Link>
        <div className="border-t border-sand mt-1 pt-1">
          <button
            type="button"
            onClick={() => { close(); signOut({ callbackUrl: "/" }); }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal/80 hover:text-red-700 hover:bg-red-50 w-full text-left transition-colors"
          >
            <LogOut size={15} strokeWidth={1.5} />
            Wyloguj się
          </button>
        </div>
      </div>
    </HoverPopover>
  );
}
