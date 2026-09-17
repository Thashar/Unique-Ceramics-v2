"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  reconcileCart,
  reducedMessage,
  sameCart,
  soldOutMessage,
  syncCartWithServer,
  type CartPriceUpdate,
  type CartSyncResult,
} from "@/lib/cart-sync";

export type { CartPriceUpdate } from "@/lib/cart-sync";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  /** Cena do zapłaty za sztukę – już po rabacie produktowym. */
  price: number;
  /** Cena podstawowa (sprzed rabatu produktowego) – tylko do pokazania upustu. */
  basePrice?: number;
  image: string;
  quantity: number;
  stock: number;
};

const STORAGE_KEY = "uc-cart";
/**
 * Konto, z którym lokalny koszyk został już uzgodniony. Brak = koszyk gościa,
 * który przy najbliższym zalogowaniu scali się z kontem (jedyny moment unii).
 */
const OWNER_KEY = "uc-cart-owner";
/** Lokalna zmiana koszyka, której serwer jeszcze nie potwierdził (`PUT` w drodze albo nieudany). */
const DIRTY_KEY = "uc-cart-dirty";
/** Powrót do karty odświeża koszyk z konta nie częściej niż co tyle. */
const PULL_THROTTLE_MS = 15_000;

function normalize(raw: unknown[]): CartItem[] {
  return raw.map((i) => {
    const item = i as Record<string, unknown>;
    return {
      id:       String(item.id ?? ""),
      slug:     String(item.slug ?? ""),
      name:     String(item.name ?? ""),
      price:    Number(item.price ?? 0),
      // Starsze wpisy w localStorage nie mają ceny podstawowej – wtedy koszyk
      // pokazuje sam rabat za wielosztuki, tak jak przed tą zmianą
      ...(Number.isFinite(Number(item.basePrice)) && Number(item.basePrice) > 0
        ? { basePrice: Number(item.basePrice) }
        : {}),
      image:    String(item.image ?? ""),
      quantity: Number(item.quantity ?? 1),
      // Stare wpisy w localStorage nie mają stock – defaultujemy do dużej liczby
      // żeby nie blokować działania istniejących koszyków
      stock:    typeof item.stock === "number" ? item.stock : 9999,
    };
  });
}

// ── Store modułowy (localStorage) czytany przez useSyncExternalStore ─────────
// Koszyk żyje poza Reactem; komponenty subskrybują zmiany. Dzięki temu
// hydratacja z localStorage nie wymaga setState w useEffect.

const EMPTY: CartItem[] = [];
let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function parseStored(stored: string | null): CartItem[] {
  if (!stored) return EMPTY;
  try {
    return normalize(JSON.parse(stored));
  } catch {
    return EMPTY;
  }
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    items = parseStored(localStorage.getItem(STORAGE_KEY));
  } catch {}
  // Inna karta tej samej przeglądarki zmieniła koszyk – przejmujemy jej stan,
  // zamiast trzymać w pamięci stary i nadpisać nim localStorage przy pierwszej
  // własnej zmianie (tak stara karta potrafiła „wskrzesić” usunięte produkty)
  try {
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      items = parseStored(e.newValue);
      listeners.forEach((l) => l());
    });
  } catch {}
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string | null) {
  try {
    if (userId === null) localStorage.removeItem(OWNER_KEY);
    else localStorage.setItem(OWNER_KEY, userId);
  } catch {}
}

function readDirty(): boolean {
  try {
    return localStorage.getItem(DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDirty(dirty: boolean) {
  try {
    if (dirty) localStorage.setItem(DIRTY_KEY, "1");
    else localStorage.removeItem(DIRTY_KEY);
  } catch {}
}

/**
 * Zapisuje nowy stan koszyka. Każda zmiana **z tego urządzenia** oznacza koszyk
 * jako „brudny” – do czasu, aż serwer potwierdzi zapis na koncie. Stan wzięty
 * **z konta** (`fromServer`) brudny nie jest: nie ma czego odsyłać.
 */
function setItems(next: CartItem[], opts: { fromServer?: boolean } = {}) {
  items = next;
  persist();
  if (!opts.fromServer) writeDirty(true);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  // Pierwsza subskrypcja po hydratacji – React sam wykryje zmianę snapshotu
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartItem[] {
  return items;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function addItemToStore(item: Omit<CartItem, "quantity">, quantity = 1) {
  const qty = Math.max(1, quantity);
  const existing = items.find((i) => i.id === item.id);
  if (existing) {
    const newQty = Math.min(existing.quantity + qty, item.stock);
    if (newQty === existing.quantity) return;
    setItems(
      items.map((i) =>
        i.id === item.id ? { ...i, quantity: newQty, stock: item.stock } : i
      )
    );
    return;
  }
  if (item.stock < 1) return;
  setItems([...items, { ...item, quantity: Math.min(qty, item.stock) }]);
}

function removeItemFromStore(id: string) {
  setItems(items.filter((i) => i.id !== id));
}

function updateQuantityInStore(id: string, qty: number) {
  if (qty < 1) return;
  setItems(
    items.map((i) => (i.id !== id ? i : { ...i, quantity: Math.min(qty, i.stock) }))
  );
}

function clearCartStore() {
  setItems([]);
}

/**
 * Wyrównuje koszyk do cen i stanów z serwera. Logikę liczy `lib/cart-sync.ts`;
 * tutaj zostaje tylko zapis do store'u i zgłoszenie powiadomień.
 *
 * Wyprzedane pozycje **znikają z koszyka i są nazwane w komunikacie** – po cichu
 * zmieniona suma byłaby dla klienta niezrozumiała.
 */
function syncPricesInStore(updates: CartPriceUpdate[]): CartSyncResult {
  const empty: CartSyncResult = {
    items,
    changed: false,
    soldOut: [],
    reduced: [],
    priceChanged: false,
  };
  if (!loaded || items.length === 0) return empty;

  const result = syncCartWithServer(items, updates);
  if (result.changed) setItems(result.items);

  const soldOut = soldOutMessage(result.soldOut);
  if (soldOut) pushCartNotice(soldOut, "warning");
  const reduced = reducedMessage(result.reduced);
  if (reduced) pushCartNotice(reduced, "warning");

  return result;
}

// ── Powiadomienia koszyka ────────────────────────────────────────────────────
//
// Zmiany w koszyku bywają dokonywane **za plecami klienta** (produkt sprzedał
// się komuś innemu, cena promocyjna wygasła). Taka zmiana musi zostać nazwana,
// i to niezależnie od tego, na której stronie klient akurat jest – dlatego
// powiadomienia żyją w osobnym store i wyświetla je `CartToasts` z layoutu.

export type CartNotice = {
  id: number;
  text: string;
  kind: "info" | "warning";
};

let notices: CartNotice[] = [];
let noticeId = 0;
const noticeListeners = new Set<() => void>();

function emitNotices() {
  noticeListeners.forEach((l) => l());
}

export function pushCartNotice(text: string, kind: CartNotice["kind"] = "info") {
  // Ten sam komunikat nie ma się mnożyć przy kilku synchronizacjach pod rząd
  if (notices.some((n) => n.text === text)) return;
  notices = [...notices, { id: ++noticeId, text, kind }];
  emitNotices();
}

export function dismissCartNotice(id: number) {
  notices = notices.filter((n) => n.id !== id);
  emitNotices();
}

function subscribeNotices(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

const NO_NOTICES: CartNotice[] = [];

export function useCartNotices(): CartNotice[] {
  return useSyncExternalStore(
    subscribeNotices,
    () => notices,
    () => NO_NOTICES
  );
}

export function useCart() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => addItemToStore(item, quantity),
    []
  );
  const removeItem = useCallback((id: string) => removeItemFromStore(id), []);
  const updateQuantity = useCallback(
    (id: string, qty: number) => updateQuantityInStore(id, qty),
    []
  );
  const clearCart = useCallback(() => clearCartStore(), []);
  const syncPrices = useCallback(
    (updates: CartPriceUpdate[]) => syncPricesInStore(updates),
    []
  );

  const count = current.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = current.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    items: current,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    syncPrices,
    count,
    subtotal,
  };
}

/**
 * Odświeża ceny koszyka z serwera raz po wejściu na stronę.
 *
 * Bez tego klient ogląda cenę zapamiętaną w chwili dodania produktu – po
 * wygaśnięciu przeceny rozjeżdża się ona z kwotą, którą policzy `/api/checkout`.
 * Zwraca `true`, gdy coś się zmieniło, żeby strona mogła o tym uprzedzić.
 *
 * Błąd sieci celowo przechodzi bez śladu: kwoty i tak weryfikuje serwer przy
 * składaniu zamówienia, a straszenie komunikatem przy chwilowym braku sieci
 * tylko blokowałoby zakupy.
 */
export type CartPriceSyncState = {
  /** Zmieniła się cena którejś pozycji – strona informuje o tym w podsumowaniu. */
  priceChanged: boolean;
  /**
   * Zmieniła się **dostępność**: pozycja wypadła z koszyka albo przycięliśmy
   * ilość. Strona zamówienia musi wtedy cofnąć klienta do koszyka – zmianę
   * zawartości trzeba zobaczyć i potwierdzić świadomie, a nie zamówić resztę
   * bez zauważenia braku. Komunikat pokazuje dymek ze store'u.
   */
  availabilityChanged: boolean;
};

export function useCartPriceSync(): CartPriceSyncState {
  const [state, setState] = useState<CartPriceSyncState>({
    priceChanged: false,
    availabilityChanged: false,
  });

  useEffect(() => {
    let cancelled = false;
    const ids = getSnapshot().map((i) => i.id);
    if (ids.length === 0) return;

    fetch("/api/cart/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.products) return;
        const result = syncPricesInStore(data.products);
        setState({
          priceChanged: result.priceChanged,
          availabilityChanged: result.soldOut.length > 0 || result.reduced.length > 0,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Pobiera aktualne dane produktów z koszyka i wyrównuje do nich store.
 *
 * Zwraca wynik wyrównania (albo `null`, gdy nie udało się odpytać serwera), żeby
 * wywołujący wiedział, czy klient dostał już komunikat – i mógł dołożyć własny,
 * jeśli nie.
 */
export async function refreshCartFromServer(
  ids: string[]
): Promise<CartSyncResult | null> {
  if (ids.length === 0) return null;
  try {
    const res = await fetch("/api/cart/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.products) return null;
    return syncPricesInStore(data.products);
  } catch {
    // Brak sieci nie może blokować zakupów – kwoty i stany weryfikuje serwer
    return null;
  }
}

// ── Koszyk przypisany do konta ───────────────────────────────────────────────

/** Koszyk zapisany na koncie; `null`, gdy serwer nie odpowiedział poprawnie. */
async function fetchAccountCart(): Promise<CartItem[] | null> {
  try {
    const res = await fetch("/api/account/cart");
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.items) ? normalize(data.items) : null;
  } catch {
    return null;
  }
}

/**
 * Zapisuje koszyk na koncie. Po potwierdzeniu zdejmuje znacznik „brudny” –
 * ale tylko wtedy, gdy w międzyczasie koszyk się nie zmienił (wtedy czeka
 * na niego kolejny zapis).
 */
async function putAccountCart(snapshot: CartItem[]): Promise<boolean> {
  try {
    const res = await fetch("/api/account/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: snapshot }),
    });
    if (!res.ok) return false;
    if (getSnapshot() === snapshot) writeDirty(false);
    return true;
  } catch {
    return false;
  }
}

/** Po wylogowaniu koszyk nie może zostać na cudzym ekranie. */
function forgetAccountCart() {
  setItems([], { fromServer: true });
  writeOwner(null);
  writeDirty(false);
}

/**
 * Trzyma koszyk w zgodzie z kontem klienta.
 *
 *  • **pierwsze spotkanie koszyka z kontem** (koszyk gościa po zalogowaniu,
 *    `uc-cart-owner` ≠ id) – scalenie unią (`mergeCarts`: ilości to większa
 *    z dwóch, nie suma), zapis na konto i oznaczenie koszyka jako uzgodnionego;
 *  • **każde kolejne wczytanie strony** (przeładowanie, nowa karta, po deployu,
 *    telefon otwarty od tygodnia) – **konto jest prawdą**: koszyk z urządzenia
 *    zostaje zastąpiony zapisanym na koncie, chyba że ma zmiany, których
 *    serwer jeszcze nie potwierdził (`uc-cart-dirty`) – wtedy idą na konto;
 *  • **przy każdej zmianie** zalogowanego koszyka – zapis na konto;
 *  • **po powrocie do karty** (`visibilitychange`/`focus`/`pageshow`) – ponowne
 *    pobranie z konta, żeby karta otwarta w tle nie pokazywała starego koszyka;
 *  • **po wylogowaniu** – koszyk na urządzeniu jest czyszczony.
 *
 * ⚠️ Nie wracaj do scalania unią przy każdym wczytaniu strony. Unia nie umie
 * wyrazić usunięcia: pozycja usunięta na jednym urządzeniu (albo kupiona)
 * wracała z drugiego przy najbliższym przeładowaniu – patrz `reconcileCart`.
 *
 * Wylogowanie rozpoznajemy po **przejściu** `authenticated → unauthenticated`.
 * Sam stan `unauthenticated` nie wystarcza: gość nigdy nie był zalogowany,
 * a jego koszyk musi przetrwać (sklep dopuszcza zakupy bez konta).
 */
export function useCartAccountSync(status: string, userId: string | null): void {
  const previousStatus = useRef<string | null>(null);
  const syncedFor = useRef<string | null>(null);
  // Konto, dla którego uzgodnienie się zakończyło – dopiero wtedy zmiany
  // koszyka mogą iść na serwer (inaczej zapis z urządzenia wyprzedzałby
  // odczyt konta i nadpisywał je koszykiem gościa)
  const [readyFor, setReadyFor] = useState<string | null>(null);

  useEffect(() => {
    const was = previousStatus.current;
    previousStatus.current = status;

    if (status === "loading") return;

    // Wylogowanie – dopiero przejście ze stanu zalogowanego
    if (status === "unauthenticated") {
      if (was === "authenticated") {
        syncedFor.current = null;
        setReadyFor(null);
        forgetAccountCart();
      }
      return;
    }

    if (status !== "authenticated" || !userId) return;
    if (syncedFor.current === userId) return;
    syncedFor.current = userId;

    // Zamiast flagi `cancelled` sprawdzamy `syncedFor` – wylogowanie w trakcie
    // zeruje ją, a wynik uzgodnienia nie może wtedy trafić do pustego koszyka
    const stillMine = () => syncedFor.current === userId;

    (async () => {
      try {
        const saved = await fetchAccountCart();
        if (!saved || !stillMine()) return;

        const { items: next, action } = reconcileCart({
          local: getSnapshot(),
          saved,
          owner: readOwner(),
          userId,
          dirty: readDirty(),
        });

        if (action === "pull") {
          if (!sameCart(next, getSnapshot())) setItems(next, { fromServer: true });
        } else {
          setItems(next);
          await putAccountCart(next);
          if (!stillMine()) return;
        }
        writeOwner(userId);

        // Koszyk z konta może zawierać pozycje sprzed dłuższego czasu –
        // od razu sprawdzamy, czy nadal są w sprzedaży
        await refreshCartFromServer(next.map((i) => i.id));
      } catch {
        // Koszyk na urządzeniu zostaje – lepiej niż go zgubić
      } finally {
        if (stillMine()) setReadyFor(userId);
      }
    })();
  }, [status, userId]);

  // Zapis na konto przy każdej zmianie koszyka zalogowanego klienta
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (status !== "authenticated" || !userId || readyFor !== userId) return;
    if (!readDirty()) return;
    const timer = setTimeout(() => {
      void putAccountCart(current);
    }, 600);
    return () => clearTimeout(timer);
  }, [current, status, userId, readyFor]);

  // Powrót do karty – koszyk z konta zamiast tego, który karta pamięta z rana
  useEffect(() => {
    if (status !== "authenticated" || !userId || readyFor !== userId) return;
    let last = Date.now();

    const pull = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last < PULL_THROTTLE_MS) return;
      last = Date.now();
      // Niewysłane zmiany lokalne mają pierwszeństwo – odeśle je zapis wyżej
      if (readDirty() || readOwner() !== userId) return;

      const saved = await fetchAccountCart();
      if (!saved || readDirty() || syncedFor.current !== userId) return;
      if (sameCart(saved, getSnapshot())) return;
      setItems(saved, { fromServer: true });
      await refreshCartFromServer(saved.map((i) => i.id));
    };

    document.addEventListener("visibilitychange", pull);
    window.addEventListener("focus", pull);
    window.addEventListener("pageshow", pull);
    return () => {
      document.removeEventListener("visibilitychange", pull);
      window.removeEventListener("focus", pull);
      window.removeEventListener("pageshow", pull);
    };
  }, [status, userId, readyFor]);
}
