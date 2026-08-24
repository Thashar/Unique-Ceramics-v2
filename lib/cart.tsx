"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  mergeCarts,
  reducedMessage,
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

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) items = normalize(JSON.parse(stored));
  } catch {}
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function setItems(next: CartItem[]) {
  items = next;
  persist();
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

/**
 * Trzyma koszyk w zgodzie z kontem klienta.
 *
 *  • **po zalogowaniu** – koszyk z urządzenia scala się z zapisanym na koncie
 *    (`mergeCarts`: ilości to większa z dwóch, nie suma) i wraca na serwer,
 *    dzięki czemu klient znajduje go na innym urządzeniu;
 *  • **przy każdej zmianie** zalogowanego koszyka – zapis na konto;
 *  • **po wylogowaniu** – koszyk na urządzeniu jest czyszczony, żeby nie został
 *    na cudzym ekranie.
 *
 * Wylogowanie rozpoznajemy po **przejściu** `authenticated → unauthenticated`.
 * Sam stan `unauthenticated` nie wystarcza: gość nigdy nie był zalogowany,
 * a jego koszyk musi przetrwać (sklep dopuszcza zakupy bez konta).
 */
export function useCartAccountSync(status: string, userId: string | null): void {
  const previousStatus = useRef<string | null>(null);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    const was = previousStatus.current;
    previousStatus.current = status;

    if (status === "loading") return;

    // Wylogowanie – dopiero przejście ze stanu zalogowanego
    if (status === "unauthenticated") {
      if (was === "authenticated") {
        syncedFor.current = null;
        clearCartStore();
      }
      return;
    }

    if (status !== "authenticated" || !userId) return;
    if (syncedFor.current === userId) return;
    syncedFor.current = userId;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/cart");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const saved: CartItem[] = Array.isArray(data?.items) ? normalize(data.items) : [];
        const merged = mergeCarts(getSnapshot(), saved);
        setItems(merged);
        await fetch("/api/account/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: merged }),
        });
        // Scalony koszyk może zawierać pozycje sprzed dłuższego czasu –
        // od razu sprawdzamy, czy nadal są w sprzedaży
        await refreshCartFromServer(merged.map((i) => i.id));
      } catch {
        // Koszyk na urządzeniu zostaje – lepiej niż go zgubić
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  // Zapis na konto przy każdej zmianie koszyka zalogowanego klienta
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    if (syncedFor.current !== userId) return; // scalanie jeszcze trwa
    const timer = setTimeout(() => {
      fetch("/api/account/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: current }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [current, status, userId]);
}
